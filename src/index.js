const path = require('path');
const express = require('express');
var bodyParser = require('body-parser');
const fs = require("fs");
const { Client } = require('pg');
 
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'logintest',
  user: 'postgres',
  password: 'labrazzi',
})

client.on('error', (err) => console.log(err));

async function connectClient() {
	await client.connect()
}

connectClient()

const app = express();

console.log(__dirname)

// Giving static access to the public dir and the /img storage
app.use('',express.static(path.join(__dirname, 'public')));
app.use('/media',express.static(path.join(__dirname, '../img')));

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.get('/', (request, response) => {
	return response.sendFile('dashboard.html', { root: '.' });
});

app.get('/auth/discord', (request, response) => {
	return response.sendFile('dashboard.html', { root: '.' });
});

// Generate a random filename
function generateFilename() {
	const timestamp = new Date().getTime();
	const randomNum = Math.floor(Math.random() * 1000);
	return (timestamp + "-" + randomNum);
  }

const getDiscordId = async (token) => {
    const url='https://discord.com/api/users/@me';
v
	let rawdata

	try{
	rawdata = await fetch(url, {
		headers: {
			"authorization": token,
		},
	})
	}catch (error) {
		console.log(error)
	}

	let data = await rawdata.json();
	console.log(data['id'])
	return data['id']

}

async function discordWHnotif() {
 // i do javascript, you fuck boys we all have our roles , it's nicky time.
  const url='https://discord.com/api/webhooks/1126515602249494608/WqL0DmQtEyNviZtql-d-EhA9UH3I50BWNJv_vmTBnJHcoJaexJHqHJ-8VA696fAATM-N';
  const data = `{
    "content": "aoooo frociaaaa @everyone hanno postato una foto attenta eh",
    "embeds": null,
    "attachments": []
  }`;
  const response = await fetch(url, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: data,
  });
}

// Endpoint for saving the image
app.post("/api/postimg", async (req, res) => {
  
  const { image } = req.body
  const { token } = req.headers
  const { board } = req.headers
  
  // Discord ID
  const uid = await getDiscordId(token).then(val => {return val});
  
  if (!uid){	// checks if the discord id is there, cannot continue otherwide													DISCORD CHECK
	res.status(200).send({outcome:`There was an error with discord. Log in again. [${uid}]`}); return
	}

	// Check if the user is banned (has the 'banned' flag)																		BAN CHECK
	let user_flags = await getFlags(uid).then(value => {return value});
	if (user_flags.includes('banned')){
		res.status(200).send({outcome:"You are banned dumbass."}); return
   	}


	// This part of the code ensures a users posts are at least 2 minutes apart													DELAY CHECK
	let skipcheck = false
	let lpd // last post date
	try {
		lpd = 
			(await client.query(`SELECT created_at FROM posts WHERE id = '${uid}' ORDER BY created_at DESC LIMIT 1`))
			.rows[0]
			['created_at'];
	} catch (error) {
		// this happens when the user has no posts, therefore we can skip the check
		skipcheck = true
	}
		
	// less then 2 minutes 120000ms = 2 mins
	const postDelay = 20000
	const sinceLast = Date.now() - lpd
	if (sinceLast < postDelay && !skipcheck)
	{
		console.log("too fast!")
		const waitX = Math.round((postDelay - sinceLast)/1000); //Number of seconds the user needs to wait before posting again
		res.status(200).send({outcome:"TOO FAST! Wait " + (waitX) + " seconds!"}); return
	}

	//Checks if the board you're trying to post to is banned																	BOARD BAN CHECK
	let board_flags = await getBFlags(board).then(value => {if (value) return value; else return '';});
	if (board_flags.includes('banned')){
		res.status(200).send({outcome:"You can't post on a banned board! Sillyhead..."}); return
   	}

	// Actually wrining the image to file and adding it to the posts table so it can be retrieved later							ALL CLEAR - POSTING
	const base64Data = image.replace(/^data:image\/png;base64,/, ""); 	// Remove the data URL header
	const filename = `image-${board}_${generateFilename()}`; 								// Generate a unique filename. (image<timestamp>-<3 random numbers>)
	const imagePath = path.join(__dirname, "../img"); 						// Path to the /img/ directory on the server
	
	// Write the image file to the /img/ directory
	fs.writeFile(`${imagePath}/${filename}.png`, base64Data, "base64", (err) => {
		if (err) {
			res.status(200).send({outcome:err}); return
		} else {
			console.log("img saved :3")	
			discordWHnotif()														// filaname is used as some sort of post id
			client.query(`INSERT INTO posts(id, file_name, board) VALUES('${uid}', '${filename}', '${board}');`); 	// add post to posts table in le database (timestamp is automatic)
			updateBoardQty(board)
			res.status(200).send({outcome:"Post sent succesfully :3"}); return
    	}
  	});

});

// do i need to explain the endpoint called "api/deletepost" deletes posts?
app.post("/api/deletepost", async (req, res) => {
  
	const { token } = req.headers
	let { filename } = req.headers
	filename = filename.replace("'", ""); // this might prevent sql injection i hope

	req_id = await getDiscordId(token).then(val => {return val}); // Id of the user making the request
	const uFlags = await getFlags(req_id).then(val => {return val}) // flags of said user
	
		let id // ID of the user who made the post that it's trying to delete
		try {
			const resp_raw = 
			(await client.query(`SELECT id FROM posts WHERE file_name='${filename}' LIMIT 1`)) 
		
			id = (
			resp_raw
			.rows[0]
			['id'])
		} 
		catch (error) {
			res.status(200).send({ outcome: error.toString()}); return
		}

		if (id == req_id){ // If the user who made the post and the user that is trying to remove it are the same we can delete the post
			
			try {
				await client.query(`DELETE FROM posts WHERE file_name = '${filename}'`) // Sql post removal
			} 
			catch (error) {	// sql querys always have try catches because for once i'm a little bitch but mainly because it might crash the whole thing 
				res.status(200).send({ outcome: error}); return
			}

			res.status(200).send({ outcome: 'Post deleted! :3'});return	// outcome method my beloved

		} else if (uFlags.includes('admin')){ // Someone is trying to delete someone elses post. Are they an admin?

			try {
				await client.query(`DELETE FROM posts WHERE file_name = '${filename}'`) // Sql post removal
			} 
				catch (error) { // these try catches are really ugly but oh well
					res.status(200).send({ outcome: error}); return
			}

			res.status(200).send({ outcome: 'Post fucking deleted! :3'}); return	// could have just used an or here but i really wanted the fucking deleted here

		}else{
			res.status(200).send({outcome: 'You can only delete your own posts sillyhead!!'}); // so silly
		}

});

app.post("/api/ban", async (req, res) => {
  
	const { token } = req.headers
	const { filename } = req.headers // filename of a post by the user that it wants to ban

	admin_id = await getDiscordId(token).then(val => {return val}); // Discord ID of the supposed admin
	const adminflags = await getFlags(admin_id).then(val => {return val.toString()}) // Flags of said user

	if (adminflags.includes('admin')){ // Bans can only be called by admins

		let id // id of the to-be-banned user
		try {
			const resp_raw = 
			(await client.query(`SELECT id FROM posts WHERE file_name='${filename}' LIMIT 1`))
		
			id = (
			resp_raw
			.rows[0]
			['id'])
		} 
			catch (error) {
				res.status(200).send({ outcome: error}); return
			}

		try { 					// Adding the 'banned' flag to that used. Making it unable for it to post ever again.
			await client.query(`INSERT INTO users(id, flags) VALUES('${id}', 'banned') ON CONFLICT(id) DO UPDATE SET flags = 'banned'`)
		} 
			catch (error) {
				res.status(200).send({ outcome: error}); return
		}

		try {					// Deleting every post made by the user from the DB
			await client.query(`DELETE FROM posts WHERE id = '${id}'`)
		} 
			catch (error) {
				res.status(200).send({ outcome: error}); return
		}

		res.status(200).send({ outcome: "User banned!"}); return

	}else{
		res.status(200).send('Buddy, you\'re not an admin... how did you get here?');
	}

});

// returns the flags of a user by id querying the users table, returns 'none' if the user is not in the table
async function getFlags(id) {

	let resp = 'none'
	try {
		const resp_raw = 
		(await client.query(`SELECT flags FROM users WHERE id='${id}' LIMIT 1`))
	
		resp = (
		resp_raw
		.rows[0]
		['flags'])
	} 
		catch (error) {
		
	}

	return (resp)

}

// Same as above but for Boards instead of users
async function getBFlags(id) {

	let resp = 'none'
	try {
		const resp_raw = 
		(await client.query(`SELECT flags FROM boards WHERE board_id='${id}' LIMIT 1`))
	
		resp = (
		resp_raw
		.rows[0]
		['flags'])
	} 
		catch (error) {
		
	}

	return (resp)

}

// Endpoint for user flags
app.get("/api/flags", async (req, res) => {

	const { uid } = req.headers;

	let user_flags = 'none' 
	await getFlags(uid).then(value => {
		user_flags = value
	});

	res.send({ flags: `${user_flags}` })

});

// Updates the number of posts on a board stored in the board table by counting the ammount of posts with that board
async function updateBoardQty(board) {
	
	let resp_raw
	if (board == 'all') {
		resp_raw = 
		(await client.query(`SELECT board FROM posts`))
	} else {
		resp_raw = 
		(await client.query(`SELECT board FROM posts WHERE board = '${board}'`))
	}
	
	const resp = Array.from(resp_raw.rows)
	// console.log("board numbers: " + resp.length)
	// this is just edited ban code
	await client.query(`INSERT INTO boards(board_id, post_qty) VALUES('${board}', ${resp.length}) ON CONFLICT(board_id) DO UPDATE SET post_qty = ${resp.length}`)
	
}

// Endpoint for board info
app.get("/api/board", async (req, res) => {

	const { board } = req.headers
	
	await updateBoardQty(board)

	const resp_raw = 
	(await client.query(`SELECT * FROM boards WHERE board_id = '${board}'`))
	// we can just send all the db info for a board who cares anyways
	const resp = resp_raw.rows[0]
	res.send(resp)

});

// Endpoint for feed
app.get("/api/feed", async (req, res) => {

	const { page } = req.headers;
	const { board } = req.headers

	if (board == 'all') {

		const resp_raw = 
		(await client.query(`SELECT * FROM posts ORDER BY created_at DESC LIMIT ${15 * page}`))
		// Just sending the whole fucking the WHOLE thing
		const resp = resp_raw.rows
		res.send(resp)
	
	}else{

		const resp_raw = 
		(await client.query(`SELECT * FROM posts WHERE board = '${board}' ORDER BY created_at DESC LIMIT ${15 * page}`))
		// Just sending the whole fucking the WHOLE thing
		const resp = resp_raw.rows
		res.send(resp)

	}


});

const port = '19601';
app.listen(port, () => console.log(`App listening at http://localhost:${port}`));
