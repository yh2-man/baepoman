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

const RoomInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const CategoryImage = styled.img`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    object-fit: cover;
`;

const TitleGroup = styled.div`
    display: flex;
    flex-direction: column;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Subtitle = styled.span`
    font-size: 0.8rem;
    color: var(--text-color-secondary);
`;

const RoomHeaderCard = ({ title, roomType, isPrivate, categoryName, categoryImageUrl, onHangUp }) => {
  return (
    <StyledRoomHeaderCard>
      <RoomInfo>
        {categoryImageUrl && <CategoryImage src={categoryImageUrl} alt={categoryName} />}
        <TitleGroup>
          <Title>
            {title}
            {isPrivate && <span title="비공개 방">🔒</span>}
          </Title>
          <Subtitle>
            {roomType === 'group' ? `그룹 채팅 (${categoryName || '미분류'})` : '1:1 채팅'}
          </Subtitle>
        </TitleGroup>
      </RoomInfo>
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
  roomType: PropTypes.string,
  isPrivate: PropTypes.bool,
  categoryName: PropTypes.string,
  categoryImageUrl: PropTypes.string,
  onHangUp: PropTypes.func,
};

export default RoomHeaderCard;
