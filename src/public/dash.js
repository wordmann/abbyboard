//const { response } = require("express");

console.log("dash.js loaded")
const baseurl = 'https://nicky.abgl.live/'

// Get token from url
const fragment = new URLSearchParams(window.location.hash.slice(1));
let [accessToken, tokenType] = [fragment.get('access_token'), fragment.get('token_type')];

// Save the token if present
if (accessToken){
  console.log("Saving tokens...")
  window.localStorage.setItem('accessToken', accessToken.toString())
  window.localStorage.setItem('tokenType', tokenType.toString())
}

// Global vars
let pages_loaded = 0; // Number of posts loaded (10 per page)
let oc, oc2 // <h2> Elements in page used for displaying outcome of actions
let interactMode = "none"; // Determines what happens when clicking on a post interact()
let current_board = "main" // take a guess lol (influences the board you post to and the board that shows up in the feed)

let urlBoard = fragment.get('board')
console.log(fragment.toString())
if (urlBoard){
  console.log(urlBoard)
  current_board = urlBoard
}else{
  // Remove token from browser bar
  window.history.pushState("object or string", "Title", "/");
}

function onPageLoad() {
  oc = document.getElementById("outcome");
  oc2 = document.getElementById("outcome2");

  configBoardSelector()
  loadDiscord()
  loadMore()
  checkFlags()
}

function configBoardSelector() {
  // Get the input field
var input = document.getElementById("boardselector");

// Execute a function when the user presses a key on the keyboard
input.addEventListener("keypress", function(event) {
  // If the user presses the "Enter" key on the keyboard
  if (event.key === "Enter") {
    // Cancel the default action, if needed
    event.preventDefault();
    // Trigger the button element with a click
    changeBoard()
  }
}); 
}
 
// Reloads the feed after making it x posts longer
function loadMore() {
  pages_loaded += 1;
  getFeed(pages_loaded)
}

// grabs board name from #boardselector and puts in in current_board
function changeBoard() {
  const newboard = document.getElementById("boardselector").value

  if (newboard == "") return;

  // store board position in url
  window.history.pushState("object or string", "Title", `#board=${newboard}`);

  current_board = newboard;
  getFeed(pages_loaded)
}

// Get the flags of the loged in user and modify the document accordingly
async function checkFlags() {
  
  const uid = await getDiscordId(tokenType + " " + accessToken).then(value => {return value})

  const url=baseurl + 'api/flags';
	let rawdata = await fetch(url, {
		headers: {
			'uid': uid,
		},
	})

	let data = await rawdata.json();
  const uFlags = data['flags']; // User flags

  
  if (uFlags.includes('banned')){
    oc.innerHTML = "<b>YOU ARE BANNED FROM POSTING !!</b>"
  }

  if (uFlags.includes('admin')){
    oc.innerText = "Welcome back admin!"

    // Add ban button
    let ban_button = document.createElement("button")
    ban_button.innerText = "BAN MODE"
    
    ban_button.onclick = function() {
      if (interactMode == "ban") interactMode = "none";
      else interactMode = "ban";
      oc2.innerText = "Interaction mode: " + interactMode;};

    document.getElementById("util_buttons").appendChild(ban_button)
  }

}

// This function is called every time you click a post. Argument being the post element
async function interact(img){

  // Every posts "id" is actually just it's filename on the server, we need that [example image1688336748371-376]
  const imgsrc = img.src
  const filename = (imgsrc.slice(imgsrc.indexOf("image"), imgsrc.indexOf(".png")))

  if (interactMode == "ban"){
    console.log("attempting ban")

    // Banning uses your token to verify you're an admin. It deletes all of the posts by the person who made the post you clicked. Careful not to click your own post ahah (that surely had never happened)
    const url=baseurl + 'api/ban';
    let rawdata = await fetch(url, {
      method: "POST",
      headers: {
        "token": (tokenType + " " + accessToken),
        "filename": filename,
      },
    })
    
    // Most endpoints return an 'outcome' to be put in the outcome element from earlier
    let data = await rawdata.json();
    oc.innerText = data['outcome'];
    
    getFeed(pages_loaded) // Refreshing posts

  }

  if (interactMode == "delete"){
    console.log("attempting deletion")

    // Deleting checks if the post you clicked is yours and only deletes it then. unless you're an admin
    const url=baseurl + 'api/deletepost';
    let rawdata = await fetch(url, {
      method: "POST",
      headers: {
        "token": (tokenType + " " + accessToken),
        "filename": filename,
      },
    })
    
    // Most endpoints return an 'outcome' to be put in the outcome element from earlier
    let data = await rawdata.json();
    oc.innerText = data['outcome'];
  
    getFeed(pages_loaded) // Refreshing posts

  }

}

// liteterally copied off stackoverflow https://stackoverflow.com/questions/10617710/how-to-convert-jpg-image-to-png-using-javascript
function convertJpgToPng(jpgUrl, callback) {
  var img = new Image();
  
  img.onload = function() {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Convert the image to PNG format
    var pngDataUrl = canvas.toDataURL('image/png');
    
    // Pass the converted PNG URL to the callback function
    callback(pngDataUrl);
  };

  img.src = jpgUrl;
}

// Get the DataURL for the image in the file selector and passes it to the saveImage() function
function sendimg(){
oc.innerText = "Loading..."

const fileInput = document.getElementById('testimg');
    // Get a reference to the file
    const file = fileInput.files[0];

    if (!file) {
      document.getElementById("outcome").innerText = "load image first maybe??? like???";
      return;
    }

    // Filetype has to be png or jpg. That's because i don't know how to do other file types.
    if (file.type == 'image/png'){
      // Encode the file using the FileReader API (my friend gave me this code it just works ok ahah)
      const reader = new FileReader();
      reader.onloadend = () => {
          saveImage(reader.result)
      };
      reader.readAsDataURL(file);

    } else if (file.type == 'image/jpeg'){ // Gotta convert it to png before passing it to saveImage

      // Encode the file using the FileReader API (my friend gave me this code it just works ok ahah)
      const reader = new FileReader();
      reader.onloadend = () => {
          convertJpgToPng(reader.result, function (pngurl) {
            saveImage(pngurl)
          })
      };
      reader.readAsDataURL(file);

    }else{
      document.getElementById("outcome").innerText = "Please use a png or jpg image!";
    }
}

async function saveImage(dataUrl) {
  
  // Server just needs your token to see who makes a post and the dataUrl for the image, response messages are handled by the server
  const url=baseurl + 'api/postimg';
  let rawdata = await fetch(url, {
    method: "POST",
    headers: {
      "token": (tokenType + " " + accessToken),
      "board": (current_board),
      "content-type": "application/json; charset=utf-8"
    },
    body: `{ "image": "${dataUrl}" }`,
  })

  // Most endpoints return an 'outcome' to be put in the outcome element from earlier
  let data = await rawdata.json();
  oc.innerText = data['outcome'];

  getFeed(pages_loaded); // Refresh to see new content
 
} 

async function getFeed(page) {

  document.getElementById("curBoard").innerText = current_board;

  const url=baseurl + 'api/feed';
  let rawdata = await fetch(url, {
    headers: {
      "page": page,
      "board": current_board
    },
  })

  let data = await rawdata.json();
  
  const feedc = document.getElementById("feedc");

  const burl=baseurl + 'api/board';
  let brawdata = await fetch(burl, {
    headers: {
      "board": current_board
    },
  })

  try {
    let bdata = await brawdata.json();
    document.getElementById("post_qty").innerText = `this board has ${bdata.post_qty} posts`
  } catch (error) {
    document.getElementById("post_qty").innerText = `this board in empty`
  } 

  feedc.innerHTML = ""

  data.forEach(post => {
    let post_element = document.createElement("img")
    post_element.src = baseurl + `media/${post.file_name}.png`
    post_element.width = 400;
    post_element.className = "post"
    post_element.onclick = function() {interact(post_element)};
    if (current_board == 'all') {
      console.log("Showing all posts!")
      let post_div = document.createElement("div")
      let board_tag = document.createElement("p")
      
      board_tag.innerText = '>' + post.board
      board_tag.onclick = function() {
        window.history.pushState("object or string", "Title", `#board=${post.board}`);
        current_board = post.board
        getFeed(pages_loaded)
      }
      post_div.className = "postdiv"
      post_div.appendChild(post_element)
      post_div.appendChild(board_tag)

      feedc.appendChild(post_div)
    }
    else
      feedc.appendChild(post_element)
  });
  
}

function updateInputLabel(){
  const filename = document.getElementById('testimg').files[0].name
  document.getElementById("inputlabel").innerText = filename

}

const getDiscordId = async (token) => {
    const url='https://discord.com/api/users/@me';
	let rawdata = await fetch(url, {
		headers: {
			"authorization": token,
		},
	})

	let data = await rawdata.json();
		
	return data["id"]

}

// chaning the page to accomodate guest users 
function notLogedIn(){
  const loginButton = document.createElement("a");
  loginButton.href = "https://discord.com/api/oauth2/authorize?client_id=1095437103778762813&response_type=token&redirect_uri=https%3A%2F%2Fnicky.abgl.live%2Fauth%2Fdiscord&scope=identify"
  loginButton.innerHTML = "<h1 style='margin-left: 0px;'>Login with Discord</h1>"
  document.getElementById("login_info").appendChild(loginButton)

  const toBeKilled = document.getElementsByClassName("req_login");

  Array.from(toBeKilled).forEach(elem => {
    elem.style = "display: none;"
    elem.className = " ";
  });

  localStorage.clear()
}

function loadDiscord(){

    if (!accessToken) {
        if (localStorage.accessToken){
        accessToken = (localStorage.accessToken)
        tokenType = (localStorage.tokenType)
      }else{
        notLogedIn();
        return;
      }
    }

    const Http = new XMLHttpRequest();
    const url='https://discord.com/api/users/@me';
    Http.open("GET", url);
    Http.setRequestHeader("authorization", (tokenType + " " + accessToken));
    Http.send();

    Http.onreadystatechange = (e) => {
    
        if (Http.status == 200)
        {
          
          try{
            response = JSON.parse(Http.responseText)}
          catch (error){
            return;
          }

            const { username, discriminator, avatar, id} = response;
            //set the welcome username string
            if (discriminator == "0")
                document.getElementById('name').innerText = ` ${username}`;
        
                else
                document.getElementById('name').innerText = ` ${username}#${discriminator}`;
    
            //set the avatar image by constructing a url to access discord's cdn
            document.getElementById("avatar").src = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;

        }else{
          notLogedIn()
        }
    }
    
    console.log("finished.")
};
