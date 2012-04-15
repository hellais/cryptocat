var mpotr = (function(){
  var hash = function(str) {

  },

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

};

Participant.prototype = {
  initialize: function(nick, static_private_key) {
    this.nick = nick

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

  sendProtocolMessage: function(id) {
    switch(id) {
      case 'randomX':
        return {'*': {'publicKey':this.publicKey, 'randomX': gen(16,1,0)}};

      case 'ake1':
        result = {};
        for (var i in nicks){

        }

        return this.pubKey;
    }

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
        return this.sessionID;
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
      //console.log(nick);
      //console.log(id);
      //console.log(i);
      //console.log(msgs[i]);
      //console.log(JSON.stringify(this.state[id][i]));

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

r1 = gen(24, 0, 0);
r2 = gen(24, 0, 0);

p1 = ecDH(r1);
p2 = ecDH(r2);
console.log(p1);
console.log(p2);
p3 = ecDH(r1, p2);
p4 = ecDH(r2, p1);
console.log(p3);
console.log(p4);

k = hash(s + '');

var Alice = new Participant();
Alice.initialize('alice');
var Bob = new Participant();
Bob.initialize('bob');
var Charlie = new Participant();
Charlie.initialize('charlie');
var participants = [Alice, Bob, Charlie];


var messages = ['randomX'];
for (var mid in messages) {
  for (var i in participants) {
    var id = messages[mid];
    var participant = participants[i];
    res = participant.sendProtocolMessage(id);
    TestServer.send(id, res, participants[i].nick);
    console.log("Principal "+ participants[i].nick +" sent message " + id + ": " + JSON.stringify(res));
  }


  console.log("-----");
  console.log("Processing "+ id +" messages");
  console.log("-----");

  for (var i in participants) {
    var current_messages = TestServer.getMessages(id, participants[i].nick);

    console.log("Principal "+ participants[i].nick +" received: " + JSON.stringify(current_messages));

    var id = messages[mid];
    var participant = participants[i];
    res = participant.processProtocolMessages(id, current_messages);
  }

}

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

