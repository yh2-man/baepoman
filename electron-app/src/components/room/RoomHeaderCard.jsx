import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import Button from '../common/Button';

const StyledRoomHeaderCard = styled.div`
    background-color: var(--surface-color);
    border-radius: var(--border-radius);
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    margin-bottom: 16px; /* Space below the card */
`;

const Title = styled.h2`
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-color);
`;

const RoomHeaderCard = ({ title, onHangUp }) => {
  return (
    <StyledRoomHeaderCard>
      <Title>{title}</Title>
      {onHangUp && (
        <Button onClick={onHangUp} variant="danger" size="small">
          통화 끊기
        </Button>
      )}
    </StyledRoomHeaderCard>
  );
};

RoomHeaderCard.propTypes = {
  title: PropTypes.string.isRequired,
  onHangUp: PropTypes.func,
};

export default RoomHeaderCard;
