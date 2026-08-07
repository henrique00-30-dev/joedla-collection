import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '@/src/theme';

export type AdminTableColumn<T> = {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  flex?: number;
  align?: 'left' | 'center' | 'right';
  render: (item: T) => ReactNode;
};

type AdminTableProps<T> = {
  columns: AdminTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onPressRow?: (item: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AdminTable<T>({
  columns,
  data,
  keyExtractor,
  onPressRow,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription = 'Os registros aparecerão aqui.',
  emptyIcon = 'file-tray-outline',
  loading = false,
  style,
}: AdminTableProps<T>) {
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loading}>
          <View style={styles.loadingDot} />

          <Text style={styles.loadingText}>
            Carregando dados...
          </Text>
        </View>
      </View>
    );
  }

  if (!data.length) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name={emptyIcon}
              size={26}
              color="#9D5F1D"
            />
          </View>

          <Text style={styles.emptyTitle}>
            {emptyTitle}
          </Text>

          <Text style={styles.emptyDescription}>
            {emptyDescription}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            {columns.map((column) => (
              <View
                key={column.key}
                style={[
                  styles.cell,
                  styles.headerCell,
                  getColumnStyle(column),
                ]}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.headerText,
                    getTextAlignment(column.align),
                  ]}>
                  {column.label}
                </Text>
              </View>
            ))}

            {onPressRow ? (
              <View
                style={[
                  styles.cell,
                  styles.headerCell,
                  styles.actionColumn,
                ]}>
                <Text style={styles.headerText}>
                  Ação
                </Text>
              </View>
            ) : null}
          </View>

          {data.map((item, index) => {
            const rowContent = (
              <>
                {columns.map((column) => (
                  <View
                    key={column.key}
                    style={[
                      styles.cell,
                      getColumnStyle(column),
                    ]}>
                    <View
                      style={[
                        styles.cellContent,
                        getContentAlignment(
                          column.align,
                        ),
                      ]}>
                      {column.render(item)}
                    </View>
                  </View>
                ))}

                {onPressRow ? (
                  <View
                    style={[
                      styles.cell,
                      styles.actionColumn,
                    ]}>
                    <View style={styles.rowAction}>
                      <Text style={styles.rowActionText}>
                        Abrir
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={15}
                        color="#9D5F1D"
                      />
                    </View>
                  </View>
                ) : null}
              </>
            );

            if (onPressRow) {
              return (
                <Pressable
                  key={keyExtractor(item, index)}
                  accessibilityRole="button"
                  onPress={() => onPressRow(item)}
                  style={({ pressed }) => [
                    styles.row,
                    index < data.length - 1 &&
                      styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}>
                  {rowContent}
                </Pressable>
              );
            }

            return (
              <View
                key={keyExtractor(item, index)}
                style={[
                  styles.row,
                  index < data.length - 1 &&
                    styles.rowBorder,
                ]}>
                {rowContent}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function AdminTableText({
  children,
  muted = false,
  bold = false,
  numberOfLines = 1,
}: {
  children: ReactNode;
  muted?: boolean;
  bold?: boolean;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.tableText,
        muted && styles.tableTextMuted,
        bold && styles.tableTextBold,
      ]}>
      {children}
    </Text>
  );
}

export function AdminTableBadge({
  label,
  tone = 'default',
}: {
  label: string;
  tone?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info';
}) {
  const toneStyle = getBadgeTone(tone);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: toneStyle.background,
          borderColor: toneStyle.border,
        },
      ]}>
      <Text
        style={[
          styles.badgeText,
          { color: toneStyle.text },
        ]}>
        {label}
      </Text>
    </View>
  );
}

function getColumnStyle<T>(
  column: AdminTableColumn<T>,
): StyleProp<ViewStyle> {
  return {
    width: column.width,
    minWidth: column.minWidth ?? column.width ?? 140,
    flex: column.flex,
  };
}

function getTextAlignment(
  align?: 'left' | 'center' | 'right',
) {
  if (align === 'center') {
    return styles.textCenter;
  }

  if (align === 'right') {
    return styles.textRight;
  }

  return styles.textLeft;
}

function getContentAlignment(
  align?: 'left' | 'center' | 'right',
): StyleProp<ViewStyle> {
  if (align === 'center') {
    return styles.contentCenter;
  }

  if (align === 'right') {
    return styles.contentRight;
  }

  return styles.contentLeft;
}

function getBadgeTone(
  tone:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info',
) {
  switch (tone) {
    case 'success':
      return {
        background: colors.successSoft,
        border: 'rgba(37, 132, 82, 0.22)',
        text: colors.success,
      };

    case 'warning':
      return {
        background: colors.warningSoft,
        border: 'rgba(166, 106, 63, 0.22)',
        text: colors.warning,
      };

    case 'danger':
      return {
        background: colors.dangerSoft,
        border: 'rgba(188, 72, 72, 0.22)',
        text: colors.danger,
      };

    case 'info':
      return {
        background: colors.infoSoft,
        border: 'rgba(77, 113, 169, 0.22)',
        text: colors.info,
      };

    default:
      return {
        background: '#F6ECE0',
        border: '#E3D1BF',
        text: '#7D4D1E',
      };
  }
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: 13,
    backgroundColor: '#FFFDFC',
  },

  table: {
    minWidth: 760,
  },

  headerRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F4ECE3',
  },

  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFDFC',
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEE5DC',
  },

  rowPressed: {
    backgroundColor: '#FAF4ED',
  },

  cell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },

  headerCell: {
    justifyContent: 'center',
  },

  cellContent: {
    minWidth: 0,
    flex: 1,
    justifyContent: 'center',
  },

  headerText: {
    color: '#6E5A4D',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  tableText: {
    color: '#2C211A',
    fontSize: 11,
    lineHeight: 16,
  },

  tableTextMuted: {
    color: '#88776B',
  },

  tableTextBold: {
    fontWeight: '900',
  },

  textLeft: {
    textAlign: 'left',
  },

  textCenter: {
    textAlign: 'center',
  },

  textRight: {
    textAlign: 'right',
  },

  contentLeft: {
    alignItems: 'flex-start',
  },

  contentCenter: {
    alignItems: 'center',
  },

  contentRight: {
    alignItems: 'flex-end',
  },

  actionColumn: {
    width: 82,
    minWidth: 82,
    alignItems: 'center',
  },

  rowAction: {
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#F6ECE0',
  },

  rowActionText: {
    color: '#7D4D1E',
    fontSize: 9,
    fontWeight: '900',
  },

  badge: {
    minHeight: 25,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  empty: {
    minHeight: 210,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6ECE0',
  },

  emptyTitle: {
    marginTop: spacing.md,
    color: '#2C211A',
    fontSize: 14,
    fontWeight: '900',
  },

  emptyDescription: {
    maxWidth: 420,
    marginTop: spacing.xs,
    color: '#88776B',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },

  loading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9D5F1D',
  },

  loadingText: {
    color: '#88776B',
    fontSize: 10,
    fontWeight: '700',
  },
});