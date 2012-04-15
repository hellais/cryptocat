<?php
	$dataDir = "data/"; 

	function test() {
		echo "test";
	}

	function getParticipantCount() {
		$count = 0;
		if ($handle = opendir($dataDir)) {
			while (false !== ($entry = readdir($handle))) {
				if ($entry != "." && $entry != "..") 
					$count++;
			}
			closedir($handle);
		}
		return $count;
	}

	function addDataForNick($data, $nick) {
		// push data to the bottom of the file
	}

	function getAllData($nick) {
		// get all data
		// clear file
	}

	function createFile($nick) {
		// create file for nick and truncate
		$fh = fopen($dataDir + $nick, 'w');	
		fclose($fh);	
	}


