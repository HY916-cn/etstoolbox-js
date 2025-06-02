import { useId } from 'react';
import React from 'react';

export default props => {
    let id = useId();
    return (
        <>
            <input className="switch" type="checkbox" onChange={props.onChange} ref={props.inputRef} defaultChecked={props.defaultChecked} id={id}></input>
            <label className="_switch" htmlFor={id}></label>
        </>
    );
};
