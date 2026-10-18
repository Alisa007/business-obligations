import { Button, Text } from "tamagui";

/** The ✕ inside a field that puts it back to its default. `right` leaves room for what else is at the end of the field. */
export function ClearButton({
  label,
  right = 2,
  onClear,
}: {
  label: string;
  right?: number;
  onClear: () => void;
}) {
  return (
    <Button
      aria-label={label}
      onPress={onClear}
      variant="quiet"
      circular
      size="sm"
      position="absolute"
      right={right}
      // top and bottom with an auto margin centre the button on the field, whatever its height
      top={0}
      bottom={0}
      marginVertical="auto"
    >
      <Text fontSize="sm" color="placeholder-color" aria-hidden>
        ✕
      </Text>
    </Button>
  );
}
