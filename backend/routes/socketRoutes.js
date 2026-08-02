const socketRoutes = async (io, socket) => {
  socket.on("upload_update", (data) => {
    console.log("upload update", data);
    // Broadcast the update to all connected clients
    io.sockets.emit("upload_update", data);
  });
};

module.exports = socketRoutes;
