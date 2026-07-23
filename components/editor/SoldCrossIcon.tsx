import { StyleSheet, View } from 'react-native';

type SoldCrossIconProps = {
  color: string;
  /** Outer box size in dp. */
  size: number;
  /** Stroke thickness multiplier vs baseline (~3dp). 2 = 200% thicker. */
  thicknessScale?: number;
};

/** Thick X drawn with two bars — MaterialIcons close is too thin for sold marks. */
export function SoldCrossIcon({ color, size, thicknessScale = 2 }: SoldCrossIconProps) {
  const thickness = Math.max(5, Math.round(3 * thicknessScale));
  const barLength = size;

  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={[
          styles.bar,
          {
            width: barLength,
            height: thickness,
            borderRadius: thickness / 2,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.bar,
          {
            width: barLength,
            height: thickness,
            borderRadius: thickness / 2,
            backgroundColor: color,
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
  },
});
