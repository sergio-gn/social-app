import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Pressable, StyleSheet, View} from 'react-native'
import {usePalette} from 'lib/hooks/usePalette'
import {useWindowDimensions} from 'react-native'
import {gradients, s} from 'lib/styles'
import {useTheme} from 'lib/ThemeContext'
import {Text} from '../util/text/Text'
import LinearGradient from 'react-native-linear-gradient'
import {useStores} from 'state/index'
import ImageEditor, {Position} from 'react-avatar-editor'
import {TextInput} from './util'
import {enforceLen} from 'lib/strings/helpers'
import {MAX_ALT_TEXT} from 'lib/constants'
import {GalleryModel} from 'state/models/media/gallery'
import {ImageModel} from 'state/models/media/image'
import {SquareIcon, RectWideIcon, RectTallIcon} from 'lib/icons'
import {Slider} from '@miblanchard/react-native-slider'
import {MaterialIcons} from '@expo/vector-icons'
import {observer} from 'mobx-react-lite'
import {getKeys} from 'lib/type-assertions'
import {isDesktopWeb} from 'platform/detection'

export const snapPoints = ['80%']

const RATIOS = {
  '4:3': {
    Icon: RectWideIcon,
  },
  '1:1': {
    Icon: SquareIcon,
  },
  '3:4': {
    Icon: RectTallIcon,
  },
  None: {
    label: 'None',
    Icon: MaterialIcons,
    name: 'do-not-disturb-alt',
  },
} as const

type AspectRatio = keyof typeof RATIOS

interface Props {
  image: ImageModel
  gallery: GalleryModel
}

export const Component = observer(function ({image, gallery}: Props) {
  const pal = usePalette('default')
  const theme = useTheme()
  const store = useStores()
  const windowDimensions = useWindowDimensions()

  const {
    aspectRatio,
    // rotate = 0
  } = image.attributes

  const editorRef = useRef<ImageEditor>(null)
  const [scale, setScale] = useState<number>(image.attributes.scale ?? 1)
  const [position, setPosition] = useState<Position | undefined>(
    image.attributes.position,
  )
  const [altText, setAltText] = useState(image?.altText ?? '')

  const onFlipHorizontal = useCallback(() => {
    image.flipHorizontal()
  }, [image])

  const onFlipVertical = useCallback(() => {
    image.flipVertical()
  }, [image])

  // const onSetRotate = useCallback(
  //   (direction: 'left' | 'right') => {
  //     const rotation = (rotate + 90 * (direction === 'left' ? -1 : 1)) % 360
  //     image.setRotate(rotation)
  //   },
  //   [rotate, image],
  // )

  const onSetRatio = useCallback(
    (ratio: AspectRatio) => {
      image.setRatio(ratio)
    },
    [image],
  )

  const adjustments = useMemo(
    () => [
      // {
      //   name: 'rotate-left' as const,
      //   label: 'Rotate left',
      //   onPress: () => {
      //     onSetRotate('left')
      //   },
      // },
      // {
      //   name: 'rotate-right' as const,
      //   label: 'Rotate right',
      //   onPress: () => {
      //     onSetRotate('right')
      //   },
      // },
      {
        name: 'flip' as const,
        label: 'Flip horizontal',
        onPress: onFlipHorizontal,
      },
      {
        name: 'flip' as const,
        label: 'Flip vertically',
        onPress: onFlipVertical,
      },
    ],
    [onFlipHorizontal, onFlipVertical],
  )

  useEffect(() => {
    image.prev = image.cropped
    image.prevAttributes = image.attributes
    image.resetCropped()
  }, [image])

  const onCloseModal = useCallback(() => {
    store.shell.closeModal()
  }, [store.shell])

  const onPressCancel = useCallback(async () => {
    await gallery.previous(image)
    onCloseModal()
  }, [onCloseModal, gallery, image])

  const onPressSave = useCallback(async () => {
    image.setAltText(altText)

    const crop = editorRef.current?.getCroppingRect()

    await image.manipulate({
      ...(crop !== undefined
        ? {
            crop: {
              originX: crop.x,
              originY: crop.y,
              width: crop.width,
              height: crop.height,
            },
            ...(scale !== 1 ? {scale} : {}),
            ...(position !== undefined ? {position} : {}),
          }
        : {}),
    })

    image.prev = image.cropped
    image.prevAttributes = image.attributes
    onCloseModal()
  }, [altText, image, position, scale, onCloseModal])

  const getLabelIconSize = useCallback((as: AspectRatio) => {
    switch (as) {
      case 'None':
        return 22
      case '1:1':
        return 32
      default:
        return 26
    }
  }, [])

  if (image.cropped === undefined) {
    return null
  }

  const computedWidth =
    windowDimensions.width > 500 ? 410 : windowDimensions.width - 80
  const sideLength = isDesktopWeb ? 300 : computedWidth

  const dimensions = image.getResizedDimensions(aspectRatio, sideLength)
  const imgContainerStyles = {width: sideLength, height: sideLength}

  const imgControlStyles = {
    alignItems: 'center' as const,
    flexDirection: isDesktopWeb ? ('row' as const) : ('column' as const),
    gap: isDesktopWeb ? 5 : 0,
  }

  return (
    <View testID="editImageModal" style={[pal.view, styles.container, s.flex1]}>
      <Text style={[styles.title, pal.text]}>Edit image</Text>
      <View style={[styles.gap18, s.flexRow]}>
        <View>
          <View
            style={[styles.imgContainer, pal.borderDark, imgContainerStyles]}>
            <ImageEditor
              ref={editorRef}
              style={styles.imgEditor}
              image={image.cropped.path}
              scale={scale}
              border={0}
              position={position}
              onPositionChange={setPosition}
              {...dimensions}
            />
          </View>
          <Slider
            value={scale}
            onValueChange={(v: number | number[]) =>
              setScale(Array.isArray(v) ? v[0] : v)
            }
            minimumValue={1}
            maximumValue={3}
          />
        </View>
        <View>
          {isDesktopWeb ? (
            <Text type="sm-bold" style={pal.text}>
              Ratios
            </Text>
          ) : null}
          <View style={imgControlStyles}>
            {getKeys(RATIOS).map(ratio => {
              const {Icon, ...props} = RATIOS[ratio]
              const labelIconSize = getLabelIconSize(ratio)
              const isSelected = aspectRatio === ratio

              return (
                <Pressable
                  key={ratio}
                  onPress={() => {
                    onSetRatio(ratio)
                  }}
                  accessibilityLabel={ratio}
                  accessibilityHint="">
                  <Icon
                    size={labelIconSize}
                    style={[styles.imgControl, isSelected ? s.blue3 : pal.text]}
                    color={(isSelected ? s.blue3 : pal.text).color}
                    {...props}
                  />

                  <Text
                    type={isSelected ? 'xs-bold' : 'xs-medium'}
                    style={[isSelected ? s.blue3 : pal.text, s.textCenter]}>
                    {ratio}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {isDesktopWeb ? (
            <Text type="sm-bold" style={[pal.text, styles.subsection]}>
              Transformations
            </Text>
          ) : null}
          <View style={imgControlStyles}>
            {adjustments.map(({label, name, onPress}) => (
              <Pressable
                key={label}
                onPress={onPress}
                accessibilityLabel={label}
                accessibilityHint=""
                style={styles.flipBtn}>
                <MaterialIcons
                  name={name}
                  size={label?.startsWith('Flip') ? 22 : 24}
                  style={[
                    pal.text,
                    label === 'Flip vertically'
                      ? styles.flipVertical
                      : undefined,
                  ]}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={[styles.gap18, styles.bottomSection, pal.border]}>
        <Text type="sm-bold" style={pal.text} nativeID="alt-text">
          Accessibility
        </Text>
        <TextInput
          testID="altTextImageInput"
          style={[styles.textArea, pal.border, pal.text]}
          keyboardAppearance={theme.colorScheme}
          multiline
          value={altText}
          onChangeText={text => setAltText(enforceLen(text, MAX_ALT_TEXT))}
          accessibilityLabel="Alt text"
          accessibilityHint=""
          accessibilityLabelledBy="alt-text"
        />
      </View>
      <View style={styles.btns}>
        <Pressable onPress={onPressCancel} accessibilityRole="button">
          <Text type="xl" style={pal.link}>
            Cancel
          </Text>
        </Pressable>
        <Pressable onPress={onPressSave} accessibilityRole="button">
          <LinearGradient
            colors={[gradients.blueLight.start, gradients.blueLight.end]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={[styles.btn]}>
            <Text type="xl-medium" style={s.white}>
              Done
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    gap: 18,
    paddingHorizontal: isDesktopWeb ? undefined : 16,
    height: '100%',
    width: '100%',
  },
  subsection: {marginTop: 12},
  gap18: {gap: 18},
  title: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  btns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btn: {
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  imgControl: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  imgEditor: {
    maxWidth: '100%',
  },
  imgContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'solid',
    marginBottom: 4,
  },
  flipVertical: {
    transform: [{rotate: '90deg'}],
  },
  flipBtn: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 6,
    paddingTop: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    maxHeight: isDesktopWeb ? undefined : 50,
  },
  bottomSection: {
    borderTopWidth: 1,
    paddingTop: 18,
  },
})
