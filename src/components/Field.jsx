const Field = ({ label, error, ref, ...rest }) => (
    <div className="field">
        <label htmlFor={rest.id}>{label}</label>
        <input ref={ref} aria-invalid={!!error} {...rest} />
        {error && <span className="field-error" role="alert">{error}</span>}
    </div>
);
export default Field;
