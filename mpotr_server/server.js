$(document).ready(function() {
	alert("hello");
	alert("registered as nick " + register("bob"));
	alert("sent and got back: " + send('{"*": "bob"}'));
	alert("sent and got back: " + send('{"bob": "data1", "alice": "data2"}'));
	alert("recieved and got: " + recieve("bob"));
	alert("number of participants: " + getCount());
});

var buffer;

/**
* Expects payload to be JSON formatted in either of the two ways:
* {"*": data} - send data to everyone
* {"nick1": data1, "nick2": data2, ...} - send data1 to nick1, data2 to nick2, etc 
*/
function send(payload) {
	$.ajax({
		type: "POST", 
		url: "index.php",
		data: {"payload": payload},
		async: false, 
		dataType: "text",
		success: function(data) {
			buffer = data;
		}
	});
	return buffer;
}

/**
* Recieve from the server. nick should be set to the user's nick. Blocking.
* Reply will be parsed JSON.  
*/
function recieve(nick) {
	buffer = null;

	do {
		$.ajax({
			type: "POST", 
			url: "index.php",
			data: {"recieve": nick},
			dataType: "text",
			async: false, 
			success: function(data) {
				buffer = data;
			}
		});
	} while(buffer == null);

	return buffer;
}

function register(nick) {
	buffer = null;
	$.ajax({
		type: "POST", 
		url: "index.php",
		data: {"register": nick},
		async: false, 
		dataType: "text",
		success: function(data) {
			buffer = data;
		}
	});
	return buffer;
}

function getCount() {
	buffer = null;
	$.ajax({
		type: "POST", 
		url: "index.php",
		data: {"count": 0},
		async: false, 
		dataType: "text",
		success: function(data) {
			buffer = data;
		}
	});
	return buffer;
}
