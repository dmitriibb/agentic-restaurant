import TextField, { type TextFieldProps } from "@mui/material/TextField";

export function FormTextField(props: TextFieldProps) {
  const ariaLabel = typeof props.label === "string" ? props.label : undefined;

  return (
    <TextField
      {...props}
      inputProps={{
        ...props.inputProps,
        "aria-label": props.inputProps?.["aria-label"] ?? ariaLabel
      }}
    />
  );
}