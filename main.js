let localStream;
let remoteStream;
let peerConnection;
const ws = new WebSocket("wss://192.168.1.174:7244");

const servers = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

let init = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  document.getElementById("user-1").srcObject = localStream;
  // createOffer();
};
let createAnswer = async (offer) => {
  peerConnection = new RTCPeerConnection(offer);

  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log("New ICE candidate (answer):", event.candidate);
      ws.send(JSON.stringify({
        type:"ice-candidate",
        candidate:event.candidate
      }))
    }
  };

  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  console.log("answer: ", answer);

  ws.send(
    JSON.stringify({
      type: "answer",
      sdp: answer.sdp,
    })
  ); // Raw SDP answer sent as-is
};

let createOffer = async () => {
  peerConnection = new RTCPeerConnection();

  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log("New ICE candidate:", event.candidate);
    }
  };

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  console.log("offer: ", offer);

  ws.send(
    JSON.stringify({
      type: "offer",
      sdp: offer.sdp,
    })
  );
};

ws.onopen = async () => {
  ws.send(
    JSON.stringify({
      type: "joined",
      message: "user connected",
    })
  );
  await init();
};

// ws.onmessage = async (message) => {
//   console.log("ws message: ", JSON.stringify(message.data));
// };

ws.onmessage = async (e) => {
  try {
    console.log("Raw WS message:", e.data);

    const data = await JSON.parse(e.data);
    console.log("parsed data:",data)

    if (data.type === "offer") {
      alert("Incomming call");
      // await peerConnection.setRemoteDescription(
      //   new RTCSessionDescription(data.sdp)
      // )
      createAnswer(new RTCSessionDescription(data));
    }

    if (data.type === "answer") {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data)
      );
    }

    if(data.type === "ice-candidate"){
      if(data.candidate){
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    }
  } catch (error) {}
};
