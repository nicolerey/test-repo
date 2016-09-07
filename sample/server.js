'use strict';

const fs         = require( 'fs' );
const Hapi       = require( 'hapi' );
const Hook       = require( './Hook' );
const fetch      = require( 'node-fetch' );
const mkdirp     = require( 'mkdirp' );
const getDirName = require( 'path' ).dirname;
const server     = new Hapi.Server();
const githubHook = new Hook.HookClass( 'test-repo123' );

let repoPath = process.cwd() + '/test-repo';

function fetchURL ( path, option, type, callback ) {
	fetch( path, option )
	.then( ( res ) => {
		if ( type === 'json' ) {
			return res.json();
		}
		else if ( type === 'body' ) {
			return res.text();
		}
	} )
	.then( ( data ) => {
		if ( callback ) {
			callback( data );
		}
	} );
}

function addFileToRepo ( filePath, fileData ) {
	mkdirp( getDirName( filePath ), ( error ) => {
		if ( error ) {
			console.log( error );
		}

		fs.writeFile( filePath, fileData, ( err ) => {
			if ( err ) {
				console.log( err );
			}
		} );
	} );
}

function sendMessage ( data, callback ) {
	let postMessageURL = 'https://slack.com/api/chat.postMessage?';

	Object.keys( data ).forEach( ( key ) => {
		postMessageURL += key + '=' + encodeURI( data[ key ] ) + '&';
	} );

	fetchURL( postMessageURL, { 'method' : 'POST' }, 'json' );
}

server.connection( {
	'host' : '127.0.0.1',
	'port' : 4567
} );

server.route( {
	'method'  : 'POST',
	'path'    : '/payload',
	'handler' : function ( request, reply ) {
		/*let data = {
			'token'    : 'xoxp-14899500050-57182386450-76557472149-48c62ff8eb',
			'channel'  : '@nicolerey',
			'text'     : 'Test message',
			'username' : 'nicolerey'
		};

		sendMessage( data );*/

		githubHook.on( 'pull_request:open', ( hookData ) => {
			console.log( '---hookData: ', hookData );

			let url = hookData.pull_request.url + '/files';

			fetchURL( url, {}, 'json', ( json ) => {
				console.log( '---json: ', json );
				if ( json.message ) {
					return console.log( json.message );
				}

				json.forEach( ( file ) => {
					let filePath = repoPath + '/' + file.filename;

					fetchURL( file.raw_url, {}, 'body', ( fileData ) => {
						addFileToRepo( filePath, fileData );
					} );
				} );
			} );
		} );

		githubHook.handleHook( request, ( error ) => {
			if ( error ) {
				return console.log( error );
			}
		} );

		reply();
	}
} );

server.start( ( err ) => {
	if ( err ){
		console.log( err );
	}

	console.log( 'Server running @ ', server.info.uri );
} );