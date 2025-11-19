import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const InputWrapper = styled.div`
  width: 100%;
`;

const StyledLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-weight: 500;
`;

const StyledInput = styled.input`
    background-color: var(--background-color);
    color: var(--text-color);
    border: 1px solid var(--background-color);
    border-radius: var(--border-radius);
    padding: 8px;
    width: ${props => props.width || '100%'};
    height: ${props => props.height || 'auto'};
    font-size: 1rem;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: var(--primary-color);
    }

    /* Style the button part of the file input */
    &::file-selector-button {
      background-color: var(--primary-color);
      color: var(--text-color-inverted);
      border: none;
      padding: 8px 12px;
      border-radius: var(--border-radius);
      cursor: pointer;
      margin-right: 16px;
      transition: background-color 0.2s;
    }

    &::file-selector-button:hover {
      background-color: var(--primary-hover-color);
    }
`;

function Input({ label, type = 'text', placeholder, value, onChange, width, height }) {
    return (
      <InputWrapper>
        {label && <StyledLabel>{label}</StyledLabel>}
        <StyledInput
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            width={width}
            height={height}
        />
      </InputWrapper>
    );
}

// Added PropTypes
Input.propTypes = {
  label: PropTypes.string, // Add label to prop types
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  width: PropTypes.string,
  height: PropTypes.string,
};

export default Input;
