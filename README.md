# Chat en Ionic con autenticación en Firebase.

COMPONENTES.

- Página de Registro.

Se crea un formulario con email y contraseña con las validaciones correspondientes.
  
La función tryRegister permite hacer el registro del usuario mediante el método registeruser proporcionado por AuthenticateService, caso contrario se mostrará un mensaje de error.
  
 ```
 tryRegister(value) {
    this.authService.registerUser(value)
      .then(res => {
        console.log(res);
        this.errorMessage = "";
        this.successMessage = "Your account has been created. Please log in.";
      }, err => {
        console.log(err);
        this.errorMessage = err.message;
        this.successMessage = "";
      })
  ```
  
- Inicio de Sesión.

Para el inicio de sesión se crea un nuevo formulario con los mismos campos y validaciones que el registro.
  
La función loginUser permite iniciar sesión con el método loginUser proporcionado por AuthenticateService.

 ```
 loginUser(value) {
    this.authService.loginUser(value)
      .then(res => {
        console.log(res);
        this.errorMessage = "";
        this.navCtrl.navigateForward('/dashboard');
      }, err => {
        this.errorMessage = err.message;
      })
  }
  ```
  
- Chat.

Para el chat en firebase.service se crean dos funciones para interactuar con los datos de firebase, una para almacenar y otra para leer los datos.

En el caso de almacenar se utiliza la función sendMessage con ayuda de AngularFireDatabase, mientras que para obtener los datos se utiliza la función getMessages.

 ```
 sendMessage( data ) {
    return this.afdb.list( '/messages/' ).push( data );
  }
  
  getMessages() {
    return this.afdb.database.ref( '/messages' );
  }
  ```
  
Estos métodos van a ser utilizados en el chat. Aquí se realizan funciones para encriptar y desencriptar los mensajes con ayuda de crypto-js. La función de encriptar es encryptText y para desencriptar se tiene decryptText.

 ```
 encryptText( text ) {
    this.encryptedText = CryptoJS.AES.encrypt( text, '#theKey#', '#theKey#' ).toString();
    console.log( 'texto encriptado', this.encryptedText );
  }

  decryptText( text ) {
    this.decryptedText = CryptoJS.AES.decrypt( text, '#theKey#', '#theKey#' )
      .toString( CryptoJS.enc.Utf8 );
    console.log( 'desencriptado', this.decryptedText );
  }
  ```
Posteriormente al cargar la página se cargan los datos del usuario autenticado para alamacenar el id y el email del mismo que servirá para almacenarlo en la base de datos.

 ```
 this.authService.userDetails().subscribe( res => {
      console.log( 'res', res );
      if ( res !== null ) {
        this.userEmail = res.email;
        this.id = res.uid;
      } else {
        this.navCtrl.navigateBack( '' );
      }
    }, err => {
      console.log( 'err', err );
    } );
  ```
  
A la par se obtienen los datos llamando al método creado en firebase.service y se utiliza las función de desencriptar para mostrar los mensajes reales en la pantalla y se almacenan dentro de un arreglo dependiendo si es imagen o message.

```
this.chatService.getMessages().on( 'value', ( messagesSnap ) => {
      this.chats = [];
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
  ```
  
Para tomar foto se utiliza la función TakePhoto que va a permitir almacenar la imágen en el storage de firebase y se va a obtener la url de la misma para almacenarla en la base de datos.

```
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
        .then( async ( imageData ) => {
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
    } catch ( e ) {
      console.log( e );
      this.tmpImage = undefined;
    }
  }
  ```

Finalmente, la función para enviar el mensaje sendMessage que va a permitir almacenar los datos en un arreglo, con el mensaje o imagen encriptado dependiendo del caso y va a utilizar la función creada en firebase.service para guardar los datos en la base de datos.

```
async sendMessage() {
    let chat = {};
    this.encryptText( this.message );
    if ( this.tmpImage !== undefined ) {
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
    } catch ( e ) {
      console.log( 'error', e );
    }
  }
  ```
  
Para cerrar sesión se utiliza la función logout.

```
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
  ```
IMAGENES SEGURAS.

En el storage de firebase se agregan reglas para leer y escribir en donde el usuario que realiza las peticiones deberá estar autenticado y la imagen debe tener el formate image/jpeg.

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /messages/{imageId=**} {
      allow read, write: if request.auth !== null;
      allow write: if resource.contentType('image/jpeg')
    }
  }
}
```

FUNCIONAMIENTO EN CELULAR

La aplicación inicia con la pantalla de inicio de sesión que contiene dos inputs para el email y la contraseña, en caso de no tener un usuario previamente creado, existe la opción de registrar un usuario.

El registro de usuario solicita ingresar el email y la contraseña una vez finalizada se da a registrar y aparece un mensaje de que el usuario ha sido registrado con éxito y que por favor iniciemos sesión.

Al iniciar sesión con el usuario se desplegará la pantalla del chat con los mensajes correspondientes y el nombre de usuario que los mando junto a la fecha, un input para escribir el mensaje un botón para enviarlo y otro para desplegar las opciones de la cámara.

Las opciones que se despliegan son la cámara, seleccionar una imagen y cancelar. Una vez se toma la imagen esta se almacena en el storage de firebase y se muestra la url en el input, la cual debemos dar en enviar para que se almacene en la base de datos y se muuestre como un mensaje en el chat.

Para generar la apk y probarla se utiliza ```ionic cordova build android```

La apk se encuentra en el siguiente link https://drive.google.com/drive/folders/1KQZP1rxLrQn12gWwJjxtZZdPoRK0E6NL?usp=sharing

Vídeo explicativo https://youtu.be/yT3TgGt15YM

