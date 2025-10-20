import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const StyledButton = styled.button`
    background-color: ${props => props.$backgroundColor || 'var(--primary-color)'};
    color: ${props => props.$textColor || 'var(--text-color)'};
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background-color 0.2s;

    // Size variations
    ${props => {
        switch (props.$size) {
            case 'small':
                return `
                    padding: 6px 10px;
                    font-size: 0.8rem;
                `;
            case 'large':
                return `
                    padding: 12px 20px;
                    font-size: 1.1rem;
                `;
            default: // medium
                return `
                    padding: 10px 15px;
                    font-size: 1rem;
                `;
        }
    }}

    width: ${props => props.$width || 'auto'}; // Default width to auto
    margin: 8px 0; // Keep margin for general use, can be overridden by parent

    &:hover {
        background-color: ${props => props.$hoverColor || 'var(--primary-hover-color)'};
    }

    &:active {
        transform: translateY(1px);
    }
`;

function Button({
  onClick,
  children,
  className,
  backgroundColor,
  hoverColor,
  textColor,
  width,
  size // Add size to props
}) {
  return (
    <StyledButton
      onClick={onClick}
      className={className}
      $backgroundColor={backgroundColor}
      $hoverColor={hoverColor}
      $textColor={textColor}
      $width={width}
      $size={size} // Pass size to the styled component
    >
      {children}
    </StyledButton>
  );
}

// Added PropTypes
Button.propTypes = {
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  backgroundColor: PropTypes.string,
  hoverColor: PropTypes.string,
  textColor: PropTypes.string,
  width: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']), // Add size propType
};

export default Button;
