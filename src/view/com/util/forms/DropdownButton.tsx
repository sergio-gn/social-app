import React, {PropsWithChildren, useMemo, useRef} from 'react'
import {
  Dimensions,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native'
import {IconProp} from '@fortawesome/fontawesome-svg-core'
import RootSiblings from 'react-native-root-siblings'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {Text} from '../text/Text'
import {Button, ButtonType} from './Button'
import {colors} from 'lib/styles'
import {usePalette} from 'lib/hooks/usePalette'
import {useTheme} from 'lib/ThemeContext'
import {HITSLOP_10} from 'lib/constants'

const ESTIMATED_BTN_HEIGHT = 50
const ESTIMATED_SEP_HEIGHT = 16
const ESTIMATED_HEADING_HEIGHT = 60

export interface DropdownItemButton {
  testID?: string
  icon?: IconProp
  label: string
  onPress: () => void
}
export interface DropdownItemSeparator {
  sep: true
}
export interface DropdownItemHeading {
  heading: true
  label: string
}
export type DropdownItem =
  | DropdownItemButton
  | DropdownItemSeparator
  | DropdownItemHeading
type MaybeDropdownItem = DropdownItem | false | undefined

export type DropdownButtonType = ButtonType | 'bare'

interface DropdownButtonProps {
  testID?: string
  type?: DropdownButtonType
  style?: StyleProp<ViewStyle>
  items: MaybeDropdownItem[]
  label?: string
  menuWidth?: number
  children?: React.ReactNode
  openToRight?: boolean
  openUpwards?: boolean
  rightOffset?: number
  bottomOffset?: number
  accessibilityLabel?: string
  accessibilityHint?: string
}

export function DropdownButton({
  testID,
  type = 'bare',
  style,
  items,
  label,
  menuWidth,
  children,
  openToRight = false,
  openUpwards = false,
  rightOffset = 0,
  bottomOffset = 0,
  accessibilityLabel,
}: PropsWithChildren<DropdownButtonProps>) {
  const ref1 = useRef<TouchableOpacity>(null)
  const ref2 = useRef<View>(null)

  const onPress = () => {
    const ref = ref1.current || ref2.current
    ref?.measure(
      (
        _x: number,
        _y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number,
      ) => {
        if (!menuWidth) {
          menuWidth = 200
        }
        const winHeight = Dimensions.get('window').height
        let estimatedMenuHeight = 0
        for (const item of items) {
          if (item && isSep(item)) {
            estimatedMenuHeight += ESTIMATED_SEP_HEIGHT
          } else if (item && isBtn(item)) {
            estimatedMenuHeight += ESTIMATED_BTN_HEIGHT
          } else if (item && isHeading(item)) {
            estimatedMenuHeight += ESTIMATED_HEADING_HEIGHT
          }
        }
        const newX = openToRight
          ? pageX + width + rightOffset
          : pageX + width - menuWidth
        let newY = pageY + height + bottomOffset
        if (openUpwards || newY + estimatedMenuHeight > winHeight) {
          newY -= estimatedMenuHeight
        }
        createDropdownMenu(
          newX,
          newY,
          menuWidth,
          items.filter(v => !!v) as DropdownItem[],
        )
      },
    )
  }

  const numItems = useMemo(
    () =>
      items.filter(item => {
        if (item === undefined || item === false) {
          return false
        }

        return isBtn(item)
      }).length,
    [items],
  )

  if (type === 'bare') {
    return (
      <TouchableOpacity
        testID={testID}
        style={style}
        onPress={onPress}
        hitSlop={HITSLOP_10}
        ref={ref1}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || `Opens ${numItems} options`}
        accessibilityHint="">
        {children}
      </TouchableOpacity>
    )
  }
  return (
    <View ref={ref2}>
      <Button
        type={type}
        testID={testID}
        onPress={onPress}
        style={style}
        label={label}>
        {children}
      </Button>
    </View>
  )
}

function createDropdownMenu(
  x: number,
  y: number,
  width: number,
  items: DropdownItem[],
): RootSiblings {
  const onPressItem = (index: number) => {
    sibling.destroy()
    const item = items[index]
    if (isBtn(item)) {
      item.onPress()
    }
  }
  const onOuterPress = () => sibling.destroy()
  const sibling = new RootSiblings(
    (
      <DropdownItems
        onOuterPress={onOuterPress}
        x={x}
        y={y}
        width={width}
        items={items}
        onPressItem={onPressItem}
      />
    ),
  )
  return sibling
}

type DropDownItemProps = {
  onOuterPress: () => void
  x: number
  y: number
  width: number
  items: DropdownItem[]
  onPressItem: (index: number) => void
}

const DropdownItems = ({
  onOuterPress,
  x,
  y,
  width,
  items,
  onPressItem,
}: DropDownItemProps) => {
  const pal = usePalette('default')
  const theme = useTheme()
  const dropDownBackgroundColor =
    theme.colorScheme === 'dark' ? pal.btn : pal.view
  const separatorColor =
    theme.colorScheme === 'dark' ? pal.borderDark : pal.border

  const numItems = items.filter(isBtn).length

  // TODO: Refactor dropdown components to:
  // - (On web, if not handled by React Native) use semantic <select />
  // and <option /> elements for keyboard navigation out of the box
  // - (On mobile) be buttons by default, accept `label` and `nativeID`
  // props, and always have an explicit label
  return (
    <>
      {/* This TouchableWithoutFeedback renders the background so if the user clicks outside, the dropdown closes */}
      <TouchableWithoutFeedback
        onPress={onOuterPress}
        accessibilityRole="button"
        accessibilityLabel="Toggle dropdown"
        accessibilityHint="">
        <View style={[styles.bg]} />
      </TouchableWithoutFeedback>
      <View
        style={[
          styles.menu,
          {left: x, top: y, width},
          dropDownBackgroundColor,
        ]}>
        {items.map((item, index) => {
          if (isBtn(item)) {
            return (
              <TouchableOpacity
                testID={item.testID}
                key={index}
                style={[styles.menuItem]}
                onPress={() => onPressItem(index)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityHint={`Option ${index + 1} of ${numItems}`}>
                {item.icon && (
                  <FontAwesomeIcon
                    style={styles.icon}
                    icon={item.icon}
                    color={pal.text.color as string}
                  />
                )}
                <Text style={[styles.label, pal.text]}>{item.label}</Text>
              </TouchableOpacity>
            )
          } else if (isSep(item)) {
            return (
              <View key={index} style={[styles.separator, separatorColor]} />
            )
          } else if (isHeading(item)) {
            return (
              <View style={[styles.heading, pal.border]} key={index}>
                <Text style={[pal.text, styles.headingLabel]}>
                  {item.label}
                </Text>
              </View>
            )
          }
          return null
        })}
      </View>
    </>
  )
}

function isSep(item: DropdownItem): item is DropdownItemSeparator {
  return 'sep' in item && item.sep
}
function isHeading(item: DropdownItem): item is DropdownItemHeading {
  return 'heading' in item && item.heading
}
function isBtn(item: DropdownItem): item is DropdownItemButton {
  return !isSep(item) && !isHeading(item)
}

const styles = StyleSheet.create({
  bg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000',
    opacity: 0.1,
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 14,
    opacity: 1,
    paddingVertical: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 15,
    paddingRight: 40,
  },
  menuItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.gray1,
    marginTop: 4,
    paddingTop: 12,
  },
  icon: {
    marginLeft: 2,
    marginRight: 8,
    flexShrink: 0,
  },
  label: {
    fontSize: 18,
    flexShrink: 1,
    flexGrow: 1,
  },
  separator: {
    borderTopWidth: 1,
    marginVertical: 8,
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingLeft: 15,
    paddingRight: 20,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  headingLabel: {
    fontSize: 18,
    fontWeight: '500',
  },
})
