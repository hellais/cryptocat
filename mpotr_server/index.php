<?php
/**
TODO:
	- validation
	- chat

*/
	session_start();
	include 'helpers.php';

	if(isset($_POST['payload'])) {
		$payload = json_decode($_POST['payload'], true);

		// TODO: validate payload

		// send to all or specific nicks?
		if(isset($payload["*"])) {
			$data = $payload["*"];
			echo "send to all = $data";
		} else {
			foreach($payload as $key=>$value) {
				echo "$key => $value";
			}
		}
	}

	if(isset($_POST['recieve'])) {
		$nick = $_SESSION['nick'];

		// block until we have getParticipantCount() for the nick

		echo "here you go $nick";
	}

	if(isset($_POST['register'])) {
		// TODO: validate nick
		$_SESSION['nick'] = $_POST['register'];
		createFile($_SESSION['nick']);
		echo $_SESSION['nick'];
	}
	
	if(isset($_POST['reset'])) {
		session_unset();
		// TODO: clear file as well
	}

	if(isset($_POST['count'])) {
		echo getParticipantCount();
	}
