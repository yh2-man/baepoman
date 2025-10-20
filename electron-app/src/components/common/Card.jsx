import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const StyledCard = styled.div`
    background-color: var(--surface-color);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
    width: ${props => props.$width || '100%'};
    max-width: 400px;
    box-sizing: border-box;
`;

function Card({ children, width }) {
  return (
    <StyledCard $width={width}>
      {children}
    </StyledCard>
  );
}

// Added PropTypes
Card.propTypes = {
  children: PropTypes.node.isRequired,
  width: PropTypes.string,
};

export default Card;
