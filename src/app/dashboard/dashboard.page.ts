// dashboard.page.ts
import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { NavController, ActionSheetController } from '@ionic/angular';
import { AuthenticateService } from '../services/authentication.service';
import * as moment from 'moment';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import firebase from 'firebase';
import * as CryptoJS from 'crypto-js';

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

  encryptedText = '';
  decryptedText = '';

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
      const key = '';
      messagesSnap.forEach( ( messageData ) => {
        if ( messageData.val().message ) {
          this.decryptText( messageData.val().message );
          this.chats.push( {
            uid: messageData.val().uid,
            email: messageData.val().email,
            message: this.decryptedText,
            date: messageData.val().date
          } );
        } else {
          this.decryptText( messageData.val().image );
          this.chats.push( {
            uid: messageData.val().uid,
            email: messageData.val().email,
            image: this.decryptedText,
            date: messageData.val().date
          } );
        }

        console.log( 'mensaje', messageData.val().message );
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
          const putPictures = firebase.storage().ref( 'messages/' + this.imageId + '.jpeg' );
          putPictures.putString( this.tmpImage, 'data_url' ).then( ( snapshot ) => {
            console.log( 'snapshot', snapshot.ref );
          } );
          const getPicture = firebase.storage().ref( 'messages/' + this.imageId + '.jpeg' ).getDownloadURL();
          getPicture.then( ( url ) => {
            this.message = url;
          } );
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

  // Encriptar
  encryptText( text ) {
    this.encryptedText = CryptoJS.AES.encrypt( text, '#theKey#', '#theKey#' ).toString();
    console.log( 'texto encriptado', this.encryptedText );
  }

  // Desencriptar
  decryptText( text ) {
    this.decryptedText = CryptoJS.AES.decrypt( text, '#theKey#', '#theKey#' )
      .toString( CryptoJS.enc.Utf8 );
    console.log( 'desencriptado', this.decryptedText );
  }

  // Enviar mensaje
  async sendMessage() {
    let chat = {};
    this.encryptText( this.message );
    if( this.tmpImage !== undefined ) {
      chat = {
        uid: this.id,
        email: this.userEmail,
        image: this.encryptedText,
        date: Date.now()
      };
    } else {
      chat = {
        uid: this.id,
        email: this.userEmail,
        message: this.encryptedText,
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

  // Cerrar sesión
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
