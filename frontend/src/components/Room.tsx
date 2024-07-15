import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const URL = "http://localhost:3001";

const Room = ({
  name,
  localAudioTrack,
  localVideoTrack,
}: {
  name: string;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
}) => {
  const [lobby, setLobby] = useState(true);
  const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
  const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(
    null
  );
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const socket = io(`${URL}?name=${name}`);
    socket.on("send-offer", async ({ roomId }) => {
      console.log("send offer please");
      setLobby(false);

      const pc = new RTCPeerConnection();
      if (localAudioTrack) {
        pc.addTrack(localAudioTrack);
      }
      if (localVideoTrack) {
        pc.addTrack(localVideoTrack);
      }
      setSendingPc(pc);
      pc.onicecandidate = async (e) => {
        if (!e.candidate) return;
        socket.emit("add-ice-candidate", {
          candidate: e.candidate,
          type: "sender",
          roomId,
        });
      };
      pc.onnegotiationneeded = async () => {
        const sdp = await pc.createOffer();
        await pc.setLocalDescription(sdp);
        socket.emit("offer", {
          sdp,
          roomId,
        });
      };
    });
    socket.on(
      "offer",
      async ({
        roomId,
        sdp: remoteSdp,
      }: {
        roomId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        console.log("send answer please");
        setLobby(false);

        const pc = new RTCPeerConnection();
        console.log({ remoteSdp });

        pc.ontrack = (e) => {
          const stream = new MediaStream();
          stream.addTrack(e.track);
          remoteVideoRef.current!.srcObject = stream;
          remoteVideoRef.current!.play();
        };

        await pc.setRemoteDescription(remoteSdp);
        const sdp = await pc.createAnswer();
        await pc.setLocalDescription(sdp);

        setReceivingPc(pc);

        pc.onicecandidate = async (e) => {
          if (!e.candidate) return;
          const payload = {
            candidate: e.candidate,
            type: "receiver",
            roomId,
          };
          console.log({ payload });
          socket.emit("add-ice-candidate", payload);
        };

        socket.emit("answer", {
          sdp,
          roomId,
        });
      }
    );
    socket.on("answer", ({ roomId, sdp: remoteSdp }) => {
      setLobby(false);
      console.log("connection done");
      setSendingPc((pc) => {
        pc?.setRemoteDescription(remoteSdp);
        return pc;
      });
    });
    socket.on("lobby", () => {
      setLobby(true);
    });

    socket.on("add-ice-candidate", ({ candidate, type }) => {
      console.log("add ice candidate from remote");
      console.log({ candidate, type });
      if (type == "receiver") {
        setSendingPc((pc) => {
          console.log("sending", { pc });
          pc?.addIceCandidate(candidate);
          return pc;
        });
      } else {
        setReceivingPc((pc) => {
          console.log("receving", { pc });
          pc?.addIceCandidate(candidate);
          return pc;
        });
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [name, localAudioTrack, localVideoTrack]);

  useEffect(() => {
    if (localVideoRef.current && localVideoTrack) {
      localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
      localVideoRef.current?.play();
    }
  }, [localVideoTrack]);

  return (
    <>
      <div>HI{name}</div>
      <video
        height={400}
        width={400}
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
      />
      {lobby ? <div>Waiting for you to connect with someone</div> : null}
      <video
        height={400}
        width={400}
        ref={remoteVideoRef}
        autoPlay
        playsInline
      />
    </>
  );
};

export default Room;
