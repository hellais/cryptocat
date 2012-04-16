/*
window.console = {
  log: function(data) {
    var content = document.getElementById("content");
    var el = document.createElement("p")
    el.textContent = data;
    content.appendChild(el);
  }
}
*/

document.addEventListener("DOMContentLoaded", function() {


function debugLog(name, value) {
    var debug = document.getElementById("debug_content");
    var div = document.createElement("div")
    div.id = "line";
    var el = document.createElement("span");
    el.textContent = name;
    el.id = "debug_name";

    var el2 = document.createElement("span");
    el2.textContent = value;
    el2.id = "debug_value";
    div.appendChild(el);
    div.appendChild(el2);

    debug.appendChild(div);
    return true;
};


var mpotr = (function(){

  /** @scope mpotr **/
  return {
    /**
     * returns a unique (with high probability) chatroom
     * identifier.
     * nicks: Array() containing the nicks of the users
     * randomXs: Array() containing the users random data
     */
    deriveSessionID: function(nicks, randomXs){
      preimage = JSON.stringify(randomXs.sort());
      preimage += JSON.stringify(nicks.sort());
      var res = Crypto.util.hexToBytes(Whirlpool(preimage));
      // Take 16 Bytes
      res = res.slice(0, 16);
      res = Crypto.util.bytesToBase64(res);
      return res;
    },

    hash: function(s, n) {
      return Crypto.util.bytesToBase64(Crypto.util.hexToBytes(Whirlpool(s).slice(0, n / 4)));
    },

    encrypt: function(m, k) {
      return Crypto.AES.encrypt(m, Crypto.util.base64ToBytes(k));
    },

    decrypt: function(m, k) {
      return Crypto.AES.decrypt(m, Crypto.util.base64ToBytes(k));
    },

    sign: function(m, k) {
      return ecdsaSign(k, m);
    },

    mac: function(m, k) {
      return Crypto.HMAC(Whirlpool, m, Crypto.util.base64ToBytes(k));
    },

    verify_mac: function(mac, m, k) {
      return this.mac(m, k) === mac;
    },

    base64Xor: function(x1, x2){
      x1b = Crypto.util.base64ToBytes(x1);
      x2b = Crypto.util.base64ToBytes(x2);

      for (var i = 0; i < x1b.length; i++){
        x1b[i] ^= x2b[i];
      }
      return Crypto.util.bytesToBase64(x1b);
    }

  }
})();

/* This object represent a message passed on the wire */
function Message(data, getParticipant) {
  parsed = JSON.parse(data);
  this.message = parsed.msg;
  this.signature = parsed.sig
  this.sender = getParticipant(parsed.nick);
  this.verified = false;
};

Message.prototype = {
  verifyMessage: function() {
    this.verified = ecdsaVerify(this.sender.publicKey, this.signature, this.message);
  }
};

function Participant() {
  this.nick;
  this.publicKey;
  this.ephPublicKey;
  this.privateKey;
  this.ephPrivateKey;
  this.sessionKey;
  this.outstanding;
  this.outstanding_nicks;
};

Participant.prototype = {
  initialize: function(nick, static_private_key) {
    this.nick = nick
    this.outstanding = true;

    Crypto.util.bytesToBase64(Crypto.charenc.UTF8.stringToBytes('thisissecretz'));

    //generate a long-term public key if one doesn't exist
    if (!static_private_key) {
      this.privateKey = ecdsaGenPrivateKey();
    }
    this.publicKey = ecdsaGenPublicKey(this.privateKey);

    //console.log(this.privateKey);
    //console.log(this.publicKey);

    this.ephPrivateKey = ecdsaGenPrivateKey();
    this.ephPublicKey = ecdsaGenPublicKey(this.ephPrivateKey);
  },

  protocolError: function(id, errorMessage) {
    console.log('Error in protocol step ' + id + ' for ' + this.nick + ': ' + errorMessage);
  },

  Error: function(id, errorMessage) {
    console.log('Error in ' + id + ' for ' + this.nick + ': ' + errorMessage);
  },

  sendProtocolMessage: function(id) {
    switch(id) {
      case 'randomX':
        return {'*': {'publicKey':this.publicKey, 'randomX': gen(16,1,0)}};
      case 'ake':
        var result = {};
        this.akeX = {};
        for (var i in this.nicks){
          //don't send to yourself
          if (this.nicks[i] == this.nick){
            continue;
          }
          this.akeX[this.nicks[i]] = ecdsaGenPrivateKey();
          var gX = ecDH(this.akeX[this.nicks[i]]);
          result[this.nicks[i]] = {'gX': gX, 'sig': ecdsaSign(this.privateKey, gX)};
        }

        return result;

     case 'authUser1':
        var result = {};

        this.authUserEncKey = {};
        this.authUserMacKey = {};

        for (var i in this.nicks){
          //don't send to yourself
          if (this.nicks[i] == this.nick){
            continue;
          }
          this.authUserEncKey[this.nicks[i]] = mpotr.hash(this.akeGXY[this.nicks[i]] + '_encrypt', 128);
          this.authUserMacKey[this.nicks[i]] = mpotr.hash(this.akeGXY[this.nicks[i]] + '_mac', 128);
          console.log(JSON.stringify(this.authUserEncKey));

          var message = JSON.stringify([this.ephPublicKey, this.sessionID, this.nick, this.nicks[i]]);
          var ciphertext = mpotr.encrypt(message, this.authUserEncKey[this.nicks[i]]);
          var mac = mpotr.mac(ciphertext, this.authUserMacKey[this.nicks[i]]);
          result[this.nicks[i]] = {
            'ciphertext': ciphertext,
            'mac': mac,
          };

        }
        return result;

      case 'authUser2':
        var result = {};

        for (var i in this.nicks){
          //don't send to yourself
          if (this.nicks[i] == this.nick){
            continue;
          }

          var message = ecdsaSign(this.ephPrivateKey, JSON.stringify([this.ephPublicKeys[this.nicks[i]], this.sessionID, this.nick, this.nicks[i]]));
          console.log('bang');
          console.log(this.authUserEncKey[this.nicks[i]]);
          console.log(JSON.stringify(this.authUserEncKey));
          console.log(this.nicks[i]);

          var ciphertext = mpotr.encrypt(message, this.authUserEncKey[this.nicks[i]]);

          var mac = mpotr.mac(ciphertext, this.authUserMacKey[this.nicks[i]]);
          result[this.nicks[i]] = {
            'ciphertext': ciphertext,
            'mac': mac,
          };

        }

        return result;

      case 'gke1':
        var result = {};
        this.gkeX = {};
        for (var i in this.nicks){
          //don't send to yourself
          if (this.nicks[i] == this.nick){
            continue;
          }
          this.gkeX[this.nicks[i]] = ecdsaGenPrivateKey();
          var gX = ecDH(this.gkeX[this.nicks[i]]);
          result[this.nicks[i]] = {'gX': gX, 'sig': ecdsaSign(this.ephPrivateKey, gX)};
        }

        return result;

      case 'gke2':
        var result = {};

        this.gkeK = Crypto.util.bytesToBase64(Crypto.util.randomBytes(16));

        for (var i in this.nicks){
          //don't send to yourself
          if (this.nicks[i] == this.nick){
            continue;
          }
          var mask = mpotr.hash(this.gkeGXY[this.nicks[i]], 128);
          result[this.nicks[i]] = mpotr.base64Xor(this.gkeK, mask);
        }

        return result;

      case 'attest':
        var result = {};
        var params = {'version': 1, 'timeout': 18000 };
        var attest_msg = mpotr.hash(JSON.stringify([this.sessionID, params]));
        this.outstanding_nicks = this.nicks;
        for (var i in this.nicks){
          //don't send to yourself
          if (this.nicks[i] == this.nick){
            continue;
          }
          var message = this.authSend(attest_msg);

          result[this.nicks[i]] = this.authSend(message);

        }
        return result;


    }

  },

  /* Returns a signed and encrypted message to
     be broadcasted to the wire.
     The format for the message is JSON:
     [<SESSION_ID>, <CIPHER_TEXT>, <SIGNATURE>]

     <SIGNATURE> = SIGN([<SESSION_ID>, <CIPHER_TEXT>])
     <CIPHER_TEXT> = ENCRYPT({'nick': <NICKNAME>, 'msg': <MESSAGE>})
  */
  authSend: function(data) {
    var message = {
            'nick': this.nick,
            'msg': data
          };

    console.log(message);
    console.log(this.sessionKey);

    var ciphertext = mpotr.encrypt(JSON.stringify(message), this.sessionKey);
    var signature = mpotr.sign(JSON.stringify([this.sessionID, ciphertext]), this.privateKey);
    return [this.sessionID, ciphertext, signature]

  },

  authRecv: function(data) {
    var message = JSON.parse(data);
    var sessionID = message[0];
    var ciphertext = message[1];
    var signature = message[2];

    if (sessionID != this.sessionID) {
      this.Error('authRecv', 'sessionID of message does not match');
      return;
    }

    var cleartext = mpotr.decrypt(ciphertext, this.sessionKey);
    var to_verify = JSON.stringify([this.sessionID, ciphertext]);
    var parsed_ct = JSON.parse(cleartext);

    if (!ecdsaVerify(this.publicKeys[parsed_ct.nick], signature, to_verify)){
      this.Error('authRecv', 'message verification failed');
    }

    return parsed_ct;

  },

  processProtocolMessages: function(id, msgs) {
    switch(id) {
      case 'randomX':
        this.nicks = [];
        this.msgs = [];
        this.randomXs = [];
        this.publicKeys = {};
        for (var x in msgs) {
            this.nicks.push(x);
            this.randomXs.push(msgs[x]['randomX']);
            this.publicKeys[x]= msgs[x]['publicKey'];
        }
        this.sessionID = mpotr.deriveSessionID(this.nicks, this.randomXs);
        console.log("Generated sessionID: " + this.sessionID);

        debugLog("randomX "+this.nick, "Generated sessionID "+this.sessionID);
        return this.sessionID;
      case 'ake':
        this.akeGXY = {};

        for (var i in msgs){
          if (!ecdsaVerify(this.publicKeys[i], msgs[i]['sig'], msgs[i]['gX'])){
            //die?
            this.protocolError('ake', 'signature from ' + i + ' failed');
            return;
          }
          //console.log("Verifying signature from " + i);
          //console.log(ecdsaVerify(this.publicKeys[i], msgs[i]['sig'], msgs[i]['gX']));
          this.akeGXY = ecDH(this.akeX[i], msgs[i]['gX']);

        }
        return 0;
      case 'authUser1':

        this.ephPublicKeys = {};

        for (var i in msgs){

          if (!mpotr.verify_mac(msgs[i].mac, msgs[i].ciphertext, this.authUserMacKey[i])){
            this.protocolError('authUser1', 'mac from ' + i + ' failed');
            return;
          }

          var plaintext = mpotr.decrypt(msgs[i].ciphertext, this.authUserEncKey[i]);
          plaintext = JSON.parse(plaintext);

          debugLog("authUser1 "+this.nick, plaintext);
          console.log(plaintext);
          this.ephPublicKeys[i] = plaintext[0];

          if (plaintext[1] != this.sessionID){
            this.protocolError('authUser1', 'sessionID from ' + i + ' incorrect');
            return;
          }
          if (plaintext[2] != i || plaintext[3] != this.nick){
            this.protocolError('authUser1', 'participant IDs from ' + i + ' incorrect');
            return;
          }

        }
        return 0;

      case 'authUser2':

        for (var i in msgs){

          if (!mpotr.verify_mac(msgs[i].mac, msgs[i].ciphertext, this.authUserMacKey[i])){
            this.protocolError('authUser2', 'mac from ' + i + ' failed');
            return;
          }


          var signature = mpotr.decrypt(msgs[i].ciphertext, this.authUserEncKey[i]);
          var signedMessage = JSON.stringify([this.ephPublicKey, this.sessionID, i, this.nick]);
          //console.log('crypto at');
          //console.log(signature);
          //console.log(signedMessage);
          if (!ecdsaVerify(this.ephPublicKeys[i], signature, signedMessage)){
            this.protocolError('authUser2', 'signature from ' + i + ' failed');
            return;
          }

        }
        return;

      case 'attest':
        // XXX This function needs quite some refactoring..
        //
        if (this.outstanding_nicks.length == 0) {
          this.outstanding = false;
        }
        for (var i in msgs) {
          if (this.outstanding_nicks.length == 0) {
            this.outstanding = false;
          }
          console.log('bla...');
          console.log(msgs[i]);
          var attest = this.authRecv(JSON.stringify(msgs[i]));
          this.outstanding_nicks.pop(attest);
        }

        return;

      case 'gke1':
        this.gkeGXY = {};

        for (var i in msgs){
          if (!ecdsaVerify(this.ephPublicKeys[i], msgs[i]['sig'], msgs[i]['gX'])){
            //die?
            this.protocolError('gke1', 'signature from ' + i + ' failed');
            return;
          }
          this.gkeGXY[i] = ecDH(this.gkeX[i], msgs[i]['gX']);

        }
        return 0;

      case 'gke2':

        var base = this.gkeK;
        for (var i in msgs){
          var mask = mpotr.hash(this.gkeGXY[i], 128);
          var next = mpotr.base64Xor(mask, msgs[i]);
          base = mpotr.base64Xor(next, base);
        }

        this.sessionKey = base;

        //console.log(this.nick + ' derived session key ' + this.sessionKey);

        return 0;

    }

  }
};


var TestServer = {
  participants: [],
  state: {},
  nicks: [],

  send: function(id, msgs, nick) {
    if (!this.state[id]) {
      this.state[id] = {};
    }
    for (var i in msgs) {
      if (!this.state[id][i]) {
        this.state[id][i] = {};
      }
      this.state[id][i][nick] = msgs[i];
      console.log(nick);
      console.log(id);
      console.log(i);
      console.log(msgs[i]);
      console.log(JSON.stringify(this.state[id][i]));

    }
  },

  getMessages: function(id, nick) {
    //return broadcast message if it exists
    if (this.state[id]['*']) {
      return this.state[id]['*'];
    }
    return this.state[id][nick];

  }

};

r1 = ecdsaGenPrivateKey();
r2 = ecdsaGenPrivateKey();

p1 = ecDH(r1);
p2 = ecDH(r2);
//console.log(p1);
//console.log(p2);
p3 = ecDH(r1, p2);
p4 = ecDH(r2, p1);
//console.log(p3);
//console.log(p4);
//console.log(Whirlpool(p3));

var Alice = new Participant();
Alice.initialize('alice');
var Bob = new Participant();
Bob.initialize('bob');
var Charlie = new Participant();
Charlie.initialize('charlie');
var participants = [Alice, Bob, Charlie];


var messages = ['randomX', 'ake', 'authUser1', 'authUser2', 'gke1', 'gke2', 'attest'];
for (var mid in messages) {

  console.log("-----");
  console.log("Sending "+ messages[mid] +" messages");
  console.log("-----");
  debugLog("----SENDING---", messages[mid]);
  for (var i in participants) {
    var id = messages[mid];
    var participant = participants[i];
    res = participant.sendProtocolMessage(id);
    TestServer.send(id, res, participants[i].nick);
    console.log("Principal "+ participants[i].nick +" sent message " + id + ": " + JSON.stringify(res));
    debugLog(participants[i].nick +" sent message " + id, JSON.stringify(res));

  }


  console.log("-----");
  console.log("Processing "+ messages[mid] +" messages");
  console.log("-----");

  debugLog("----PROCESSING---", messages[mid]);
  for (var i in participants) {
    var current_messages = TestServer.getMessages(id, participants[i].nick);

    console.log("Principal "+ participants[i].nick +" received: " + JSON.stringify(current_messages));

    debugLog(participants[i].nick +" sent message " + id, JSON.stringify(current_messages));
    var id = messages[mid];
    var participant = participants[i];
    res = participant.processProtocolMessages(id, current_messages);
  }

}

var enc_msg = JSON.stringify(Alice.authSend("hello peeps"));
debugLog("encrypted message (ALICE)", JSON.stringify(enc_msg));
debugLog("decrypted message (ALICE)", Alice.authRecv(enc_msg).msg);


var enc_msg = JSON.stringify(Bob.authSend("Hello Alice, I verified that the message is from you!"));
debugLog("encrypted message (BOB)", JSON.stringify(enc_msg));
debugLog("decrypted message (BOB)", Bob.authRecv(enc_msg).msg);

var enc_msg = JSON.stringify(Charlie.authSend("Hello all, it's very nice to see you :)"));
debugLog("encrypted message (CHARLIE)", JSON.stringify(enc_msg));
debugLog("decrypted message (CHARLIE)", Charlie.authRecv(enc_msg).msg);


TestServer.send(id, res, participant);

/****************
    //denAKE section - needs to be replaced. Currently static DH-AKE but not deniable
    postToServer('akePub',publicKey);
    akePubs = gatherFromServer('akePub');

    akeReplyBlock = {};
	for (i=0; i < (nicks.length); i++) {
        //skip
        if (nicks[i] === nick){
            continue;
        }
        akeReplyBlock[nicks[i]] = dhgen(privateKey, akePubs[i]);
	}
    postToServer('akeReplyBlock', akeReplyBlock);
    akeReplies = gatherFromServer('akeReplyBlock');

    //remainder of key exchange

    debugOutput += "Derived session ID: " + sessionID + "<br>";

    //postToServer(

**************/

});

