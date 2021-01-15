// dashboard.page.ts
import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { NavController, ActionSheetController } from '@ionic/angular';
import { AuthenticateService } from '../services/authentication.service';
import * as moment from 'moment';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import firebase from 'firebase';

// @ts-ignore
@Component( {
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: [ './dashboard.page.scss' ],
} )
export class DashboardPage implements OnInit {

  userEmail: string;
  id: any;
  message: any;

  chats: any = [];

  imageId = Math.floor( Math.random() * 500 );

  tmpImage: any = undefined;

  constructor(
    private navCtrl: NavController,
    private authService: AuthenticateService,
    private chatService: FirebaseService,
    private camera: Camera,
    private actionSheetController: ActionSheetController
  ) { }

  ngOnInit() {

    this.authService.userDetails().subscribe( res => {
      console.log( 'res', res );
      if( res !== null ) {
        this.userEmail = res.email;
        this.id = res.uid;
      } else {
        this.navCtrl.navigateBack( '' );
      }
    }, err => {
      console.log( 'err', err );
    } );

    this.chatService.getMessages().on( 'value', ( messagesSnap ) => {
      this.chats = [];
      messagesSnap.forEach( ( messageData ) => {
        this.chats.push( { ...messageData.val() } );
        console.log( 'image', messageData.val() );
      } );
    } );

  }

  formatDate( date ) {
    const dates = moment( date, 'x' ).format( 'DD/MM/YYYY HH:mm:ss' );
    return dates;
  }

  takePhoto( sourceType ) {
    try {
      const options: CameraOptions = {
        quality: 50,
        targetHeight: 600,
        targetWidth: 600,
        destinationType: this.camera.DestinationType.DATA_URL,
        encodingType: this.camera.EncodingType.JPEG,
        mediaType: this.camera.MediaType.PICTURE,
        correctOrientation: true,
        sourceType
      };

      this.camera.getPicture( options )
        .then( async( imageData ) => {
          console.log( 'IMAGE DATA', imageData );
          this.tmpImage = 'data:image/jpeg;base64,' + imageData;
          const putPictures = firebase.storage().ref( 'imagesMessage/' + this.imageId + '.jpeg' );
          putPictures.putString( this.tmpImage, 'data_url' ).then( ( snapshot ) => {
            console.log( 'snapshot', snapshot.ref );
          } );
          const getPicture = firebase.storage().ref( 'imagesMessage/' + this.imageId + '.jpeg' ).getDownloadURL();
          getPicture.then( ( url ) => {
            this.message = url;
          } );
          // this.tmp_image = file_uri;
        } )
        .catch( ( e ) => {
          console.log( e );
          this.tmpImage = undefined;
        } );
    } catch( e ) {
      console.log( e );
      this.tmpImage = undefined;
    }
  }

  async presentActionSheetCamera() {
    const actionSheet = await this.actionSheetController.create( {
      buttons: [
        {
          text: 'Cámara',
          handler: () => {
            this.takePhoto( this.camera.PictureSourceType.CAMERA );
          }
        }, {
          text: 'Ver imágenes guardadas',
          handler: () => {
            this.takePhoto( this.camera.PictureSourceType.PHOTOLIBRARY );
          }
        }, {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    } );
    await actionSheet.present();
  }


  async sendMessage() {
    let chat = {};
    if( this.tmpImage !== undefined ) {
      chat = {
        uid: this.id,
        email: this.userEmail,
        image: this.message,
        date: Date.now()
      };
    } else {
      chat = {
        uid: this.id,
        email: this.userEmail,
        message: this.message,
        date: Date.now()
      };
    }

    try {
      await this.chatService.sendMessage( chat );
      this.message = '';
    } catch( e ) {
      console.log( 'error', e );
    }
  }

  logout() {
    this.authService.logoutUser()
      .then( res => {
        console.log( res );
        this.navCtrl.navigateBack( '' );
      } )
      .catch( error => {
        console.log( error );
      } );
  }
}
