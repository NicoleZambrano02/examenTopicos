// firebase.service.ts
import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';

@Injectable( {
  providedIn: 'root'
} )
export class FirebaseService {

  constructor(
    private afdb: AngularFireDatabase
  ) { }

  sendMessage( data ) {
    return this.afdb.list( '/messages/' ).push( data );
  }

  getMessages() {
    return this.afdb.database.ref( '/messages' );
  }
}
