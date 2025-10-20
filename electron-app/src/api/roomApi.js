/**
 * roomApi.js
 * 
 * 이 파일은 서버의 WebSocket을 통해 방(room) 관련 기능을 요청하는 함수들을 정의합니다.
 * 각 함수는 `sendMessage` 함수를 인자로 받아 특정 타입의 메시지를 서버로 전송합니다.
 */

/**
 * 서버에 현재 생성된 모든 방의 목록을 요청합니다.
 * 서버는 이 요청에 대해 'rooms-list' 타입의 메시지로 응답해야 합니다.
 * 
 * @param {function} sendMessage - WebSocket을 통해 메시지를 보내는 함수.
 */
export const requestRooms = (sendMessage) => {
  console.log("Requesting room list from server...");
  sendMessage({
    type: 'get-rooms',
  });
};

/**
 * 서버에 새로운 방 생성을 요청합니다.
 * 
 * @param {function} sendMessage - WebSocket을 통해 메시지를 보내는 함수.
 * @param {object} roomData - 생성할 방의 데이터.
 * @param {string} roomData.name - 방 제목.
 * @param {string} roomData.category - 방 카테고리.
 * @param {number} roomData.maxParticipants - 최대 참가 인원.
 * @param {number} roomData.userId - 방을 생성하는 사용자의 ID.
 */
export const createRoom = (sendMessage, roomData) => {
  console.log("Requesting to create a new room...", roomData);
  sendMessage({
    type: 'create-room',
    payload: roomData,
  });
};