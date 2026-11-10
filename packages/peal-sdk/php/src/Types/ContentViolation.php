<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ContentViolation extends JsonSerializableType
{
    /**
     * @var (
     *    'noChannels'
     *   |'overrideWithoutChannel'
     *   |'optionsWithoutChannel'
     *   |'optionsForOtherPlatform'
     *   |'optionMissing'
     *   |'optionTooLong'
     *   |'optionInvalid'
     *   |'empty'
     *   |'textTooLong'
     *   |'forbiddenCharacters'
     *   |'tooManyMedia'
     *   |'tooManyParts'
     *   |'mediaRequired'
     *   |'tooManyHashtags'
     *   |'tooManyMentions'
     *   |'tooManyLinks'
     *   |'tooManyVideos'
     *   |'mixedMedia'
     *   |'mediaTypeUnsupported'
     *   |'mediaTooLarge'
     *   |'mediaTooSmall'
     *   |'videoTooLong'
     *   |'videoTooShort'
     *   |'tooManyPixels'
     *   |'sideOutOfRange'
     *   |'aspectRatioUnsupported'
     *   |'altTextTooLong'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ContentViolationNoChannels
     *   |ContentViolationOverrideWithoutChannel
     *   |ContentViolationOptionsWithoutChannel
     *   |ContentViolationOptionsForOtherPlatform
     *   |ContentViolationOptionMissing
     *   |ContentViolationOptionTooLong
     *   |ContentViolationOptionInvalid
     *   |ContentViolationEmpty
     *   |ContentViolationTextTooLong
     *   |ContentViolationForbiddenCharacters
     *   |ContentViolationTooManyMedia
     *   |ContentViolationTooManyParts
     *   |ContentViolationMediaRequired
     *   |ContentViolationTooManyHashtags
     *   |ContentViolationTooManyMentions
     *   |ContentViolationTooManyLinks
     *   |ContentViolationTooManyVideos
     *   |ContentViolationMixedMedia
     *   |ContentViolationMediaTypeUnsupported
     *   |ContentViolationMediaTooLarge
     *   |ContentViolationMediaTooSmall
     *   |ContentViolationVideoTooLong
     *   |ContentViolationVideoTooShort
     *   |ContentViolationTooManyPixels
     *   |ContentViolationSideOutOfRange
     *   |ContentViolationAspectRatioUnsupported
     *   |ContentViolationAltTextTooLong
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'noChannels'
     *   |'overrideWithoutChannel'
     *   |'optionsWithoutChannel'
     *   |'optionsForOtherPlatform'
     *   |'optionMissing'
     *   |'optionTooLong'
     *   |'optionInvalid'
     *   |'empty'
     *   |'textTooLong'
     *   |'forbiddenCharacters'
     *   |'tooManyMedia'
     *   |'tooManyParts'
     *   |'mediaRequired'
     *   |'tooManyHashtags'
     *   |'tooManyMentions'
     *   |'tooManyLinks'
     *   |'tooManyVideos'
     *   |'mixedMedia'
     *   |'mediaTypeUnsupported'
     *   |'mediaTooLarge'
     *   |'mediaTooSmall'
     *   |'videoTooLong'
     *   |'videoTooShort'
     *   |'tooManyPixels'
     *   |'sideOutOfRange'
     *   |'aspectRatioUnsupported'
     *   |'altTextTooLong'
     *   |'_unknown'
     * ),
     *   value: (
     *    ContentViolationNoChannels
     *   |ContentViolationOverrideWithoutChannel
     *   |ContentViolationOptionsWithoutChannel
     *   |ContentViolationOptionsForOtherPlatform
     *   |ContentViolationOptionMissing
     *   |ContentViolationOptionTooLong
     *   |ContentViolationOptionInvalid
     *   |ContentViolationEmpty
     *   |ContentViolationTextTooLong
     *   |ContentViolationForbiddenCharacters
     *   |ContentViolationTooManyMedia
     *   |ContentViolationTooManyParts
     *   |ContentViolationMediaRequired
     *   |ContentViolationTooManyHashtags
     *   |ContentViolationTooManyMentions
     *   |ContentViolationTooManyLinks
     *   |ContentViolationTooManyVideos
     *   |ContentViolationMixedMedia
     *   |ContentViolationMediaTypeUnsupported
     *   |ContentViolationMediaTooLarge
     *   |ContentViolationMediaTooSmall
     *   |ContentViolationVideoTooLong
     *   |ContentViolationVideoTooShort
     *   |ContentViolationTooManyPixels
     *   |ContentViolationSideOutOfRange
     *   |ContentViolationAspectRatioUnsupported
     *   |ContentViolationAltTextTooLong
     *   |mixed
     * ),
     * } $values
     */
    private function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->value = $values['value'];
    }

    /**
     * @param ContentViolationNoChannels $noChannels
     * @return ContentViolation
     */
    public static function noChannels(ContentViolationNoChannels $noChannels): ContentViolation
    {
        return new ContentViolation([
            'type' => 'noChannels',
            'value' => $noChannels,
        ]);
    }

    /**
     * @param ContentViolationOverrideWithoutChannel $overrideWithoutChannel
     * @return ContentViolation
     */
    public static function overrideWithoutChannel(ContentViolationOverrideWithoutChannel $overrideWithoutChannel): ContentViolation
    {
        return new ContentViolation([
            'type' => 'overrideWithoutChannel',
            'value' => $overrideWithoutChannel,
        ]);
    }

    /**
     * @param ContentViolationOptionsWithoutChannel $optionsWithoutChannel
     * @return ContentViolation
     */
    public static function optionsWithoutChannel(ContentViolationOptionsWithoutChannel $optionsWithoutChannel): ContentViolation
    {
        return new ContentViolation([
            'type' => 'optionsWithoutChannel',
            'value' => $optionsWithoutChannel,
        ]);
    }

    /**
     * @param ContentViolationOptionsForOtherPlatform $optionsForOtherPlatform
     * @return ContentViolation
     */
    public static function optionsForOtherPlatform(ContentViolationOptionsForOtherPlatform $optionsForOtherPlatform): ContentViolation
    {
        return new ContentViolation([
            'type' => 'optionsForOtherPlatform',
            'value' => $optionsForOtherPlatform,
        ]);
    }

    /**
     * @param ContentViolationOptionMissing $optionMissing
     * @return ContentViolation
     */
    public static function optionMissing(ContentViolationOptionMissing $optionMissing): ContentViolation
    {
        return new ContentViolation([
            'type' => 'optionMissing',
            'value' => $optionMissing,
        ]);
    }

    /**
     * @param ContentViolationOptionTooLong $optionTooLong
     * @return ContentViolation
     */
    public static function optionTooLong(ContentViolationOptionTooLong $optionTooLong): ContentViolation
    {
        return new ContentViolation([
            'type' => 'optionTooLong',
            'value' => $optionTooLong,
        ]);
    }

    /**
     * @param ContentViolationOptionInvalid $optionInvalid
     * @return ContentViolation
     */
    public static function optionInvalid(ContentViolationOptionInvalid $optionInvalid): ContentViolation
    {
        return new ContentViolation([
            'type' => 'optionInvalid',
            'value' => $optionInvalid,
        ]);
    }

    /**
     * @param ContentViolationEmpty $empty
     * @return ContentViolation
     */
    public static function empty(ContentViolationEmpty $empty): ContentViolation
    {
        return new ContentViolation([
            'type' => 'empty',
            'value' => $empty,
        ]);
    }

    /**
     * @param ContentViolationTextTooLong $textTooLong
     * @return ContentViolation
     */
    public static function textTooLong(ContentViolationTextTooLong $textTooLong): ContentViolation
    {
        return new ContentViolation([
            'type' => 'textTooLong',
            'value' => $textTooLong,
        ]);
    }

    /**
     * @param ContentViolationForbiddenCharacters $forbiddenCharacters
     * @return ContentViolation
     */
    public static function forbiddenCharacters(ContentViolationForbiddenCharacters $forbiddenCharacters): ContentViolation
    {
        return new ContentViolation([
            'type' => 'forbiddenCharacters',
            'value' => $forbiddenCharacters,
        ]);
    }

    /**
     * @param ContentViolationTooManyMedia $tooManyMedia
     * @return ContentViolation
     */
    public static function tooManyMedia(ContentViolationTooManyMedia $tooManyMedia): ContentViolation
    {
        return new ContentViolation([
            'type' => 'tooManyMedia',
            'value' => $tooManyMedia,
        ]);
    }

    /**
     * @param ContentViolationTooManyParts $tooManyParts
     * @return ContentViolation
     */
    public static function tooManyParts(ContentViolationTooManyParts $tooManyParts): ContentViolation
    {
        return new ContentViolation([
            'type' => 'tooManyParts',
            'value' => $tooManyParts,
        ]);
    }

    /**
     * @param ContentViolationMediaRequired $mediaRequired
     * @return ContentViolation
     */
    public static function mediaRequired(ContentViolationMediaRequired $mediaRequired): ContentViolation
    {
        return new ContentViolation([
            'type' => 'mediaRequired',
            'value' => $mediaRequired,
        ]);
    }

    /**
     * @param ContentViolationTooManyHashtags $tooManyHashtags
     * @return ContentViolation
     */
    public static function tooManyHashtags(ContentViolationTooManyHashtags $tooManyHashtags): ContentViolation
    {
        return new ContentViolation([
            'type' => 'tooManyHashtags',
            'value' => $tooManyHashtags,
        ]);
    }

    /**
     * @param ContentViolationTooManyMentions $tooManyMentions
     * @return ContentViolation
     */
    public static function tooManyMentions(ContentViolationTooManyMentions $tooManyMentions): ContentViolation
    {
        return new ContentViolation([
            'type' => 'tooManyMentions',
            'value' => $tooManyMentions,
        ]);
    }

    /**
     * @param ContentViolationTooManyLinks $tooManyLinks
     * @return ContentViolation
     */
    public static function tooManyLinks(ContentViolationTooManyLinks $tooManyLinks): ContentViolation
    {
        return new ContentViolation([
            'type' => 'tooManyLinks',
            'value' => $tooManyLinks,
        ]);
    }

    /**
     * @param ContentViolationTooManyVideos $tooManyVideos
     * @return ContentViolation
     */
    public static function tooManyVideos(ContentViolationTooManyVideos $tooManyVideos): ContentViolation
    {
        return new ContentViolation([
            'type' => 'tooManyVideos',
            'value' => $tooManyVideos,
        ]);
    }

    /**
     * @param ContentViolationMixedMedia $mixedMedia
     * @return ContentViolation
     */
    public static function mixedMedia(ContentViolationMixedMedia $mixedMedia): ContentViolation
    {
        return new ContentViolation([
            'type' => 'mixedMedia',
            'value' => $mixedMedia,
        ]);
    }

    /**
     * @param ContentViolationMediaTypeUnsupported $mediaTypeUnsupported
     * @return ContentViolation
     */
    public static function mediaTypeUnsupported(ContentViolationMediaTypeUnsupported $mediaTypeUnsupported): ContentViolation
    {
        return new ContentViolation([
            'type' => 'mediaTypeUnsupported',
            'value' => $mediaTypeUnsupported,
        ]);
    }

    /**
     * @param ContentViolationMediaTooLarge $mediaTooLarge
     * @return ContentViolation
     */
    public static function mediaTooLarge(ContentViolationMediaTooLarge $mediaTooLarge): ContentViolation
    {
        return new ContentViolation([
            'type' => 'mediaTooLarge',
            'value' => $mediaTooLarge,
        ]);
    }

    /**
     * @param ContentViolationMediaTooSmall $mediaTooSmall
     * @return ContentViolation
     */
    public static function mediaTooSmall(ContentViolationMediaTooSmall $mediaTooSmall): ContentViolation
    {
        return new ContentViolation([
            'type' => 'mediaTooSmall',
            'value' => $mediaTooSmall,
        ]);
    }

    /**
     * @param ContentViolationVideoTooLong $videoTooLong
     * @return ContentViolation
     */
    public static function videoTooLong(ContentViolationVideoTooLong $videoTooLong): ContentViolation
    {
        return new ContentViolation([
            'type' => 'videoTooLong',
            'value' => $videoTooLong,
        ]);
    }

    /**
     * @param ContentViolationVideoTooShort $videoTooShort
     * @return ContentViolation
     */
    public static function videoTooShort(ContentViolationVideoTooShort $videoTooShort): ContentViolation
    {
        return new ContentViolation([
            'type' => 'videoTooShort',
            'value' => $videoTooShort,
        ]);
    }

    /**
     * @param ContentViolationTooManyPixels $tooManyPixels
     * @return ContentViolation
     */
    public static function tooManyPixels(ContentViolationTooManyPixels $tooManyPixels): ContentViolation
    {
        return new ContentViolation([
            'type' => 'tooManyPixels',
            'value' => $tooManyPixels,
        ]);
    }

    /**
     * @param ContentViolationSideOutOfRange $sideOutOfRange
     * @return ContentViolation
     */
    public static function sideOutOfRange(ContentViolationSideOutOfRange $sideOutOfRange): ContentViolation
    {
        return new ContentViolation([
            'type' => 'sideOutOfRange',
            'value' => $sideOutOfRange,
        ]);
    }

    /**
     * @param ContentViolationAspectRatioUnsupported $aspectRatioUnsupported
     * @return ContentViolation
     */
    public static function aspectRatioUnsupported(ContentViolationAspectRatioUnsupported $aspectRatioUnsupported): ContentViolation
    {
        return new ContentViolation([
            'type' => 'aspectRatioUnsupported',
            'value' => $aspectRatioUnsupported,
        ]);
    }

    /**
     * @param ContentViolationAltTextTooLong $altTextTooLong
     * @return ContentViolation
     */
    public static function altTextTooLong(ContentViolationAltTextTooLong $altTextTooLong): ContentViolation
    {
        return new ContentViolation([
            'type' => 'altTextTooLong',
            'value' => $altTextTooLong,
        ]);
    }

    /**
     * @return bool
     */
    public function isNoChannels(): bool
    {
        return $this->value instanceof ContentViolationNoChannels && $this->type === 'noChannels';
    }

    /**
     * @return ContentViolationNoChannels
     */
    public function asNoChannels(): ContentViolationNoChannels
    {
        if (!($this->value instanceof ContentViolationNoChannels && $this->type === 'noChannels')) {
            throw new Exception(
                "Expected noChannels; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isOverrideWithoutChannel(): bool
    {
        return $this->value instanceof ContentViolationOverrideWithoutChannel && $this->type === 'overrideWithoutChannel';
    }

    /**
     * @return ContentViolationOverrideWithoutChannel
     */
    public function asOverrideWithoutChannel(): ContentViolationOverrideWithoutChannel
    {
        if (!($this->value instanceof ContentViolationOverrideWithoutChannel && $this->type === 'overrideWithoutChannel')) {
            throw new Exception(
                "Expected overrideWithoutChannel; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isOptionsWithoutChannel(): bool
    {
        return $this->value instanceof ContentViolationOptionsWithoutChannel && $this->type === 'optionsWithoutChannel';
    }

    /**
     * @return ContentViolationOptionsWithoutChannel
     */
    public function asOptionsWithoutChannel(): ContentViolationOptionsWithoutChannel
    {
        if (!($this->value instanceof ContentViolationOptionsWithoutChannel && $this->type === 'optionsWithoutChannel')) {
            throw new Exception(
                "Expected optionsWithoutChannel; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isOptionsForOtherPlatform(): bool
    {
        return $this->value instanceof ContentViolationOptionsForOtherPlatform && $this->type === 'optionsForOtherPlatform';
    }

    /**
     * @return ContentViolationOptionsForOtherPlatform
     */
    public function asOptionsForOtherPlatform(): ContentViolationOptionsForOtherPlatform
    {
        if (!($this->value instanceof ContentViolationOptionsForOtherPlatform && $this->type === 'optionsForOtherPlatform')) {
            throw new Exception(
                "Expected optionsForOtherPlatform; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isOptionMissing(): bool
    {
        return $this->value instanceof ContentViolationOptionMissing && $this->type === 'optionMissing';
    }

    /**
     * @return ContentViolationOptionMissing
     */
    public function asOptionMissing(): ContentViolationOptionMissing
    {
        if (!($this->value instanceof ContentViolationOptionMissing && $this->type === 'optionMissing')) {
            throw new Exception(
                "Expected optionMissing; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isOptionTooLong(): bool
    {
        return $this->value instanceof ContentViolationOptionTooLong && $this->type === 'optionTooLong';
    }

    /**
     * @return ContentViolationOptionTooLong
     */
    public function asOptionTooLong(): ContentViolationOptionTooLong
    {
        if (!($this->value instanceof ContentViolationOptionTooLong && $this->type === 'optionTooLong')) {
            throw new Exception(
                "Expected optionTooLong; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isOptionInvalid(): bool
    {
        return $this->value instanceof ContentViolationOptionInvalid && $this->type === 'optionInvalid';
    }

    /**
     * @return ContentViolationOptionInvalid
     */
    public function asOptionInvalid(): ContentViolationOptionInvalid
    {
        if (!($this->value instanceof ContentViolationOptionInvalid && $this->type === 'optionInvalid')) {
            throw new Exception(
                "Expected optionInvalid; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isEmpty(): bool
    {
        return $this->value instanceof ContentViolationEmpty && $this->type === 'empty';
    }

    /**
     * @return ContentViolationEmpty
     */
    public function asEmpty(): ContentViolationEmpty
    {
        if (!($this->value instanceof ContentViolationEmpty && $this->type === 'empty')) {
            throw new Exception(
                "Expected empty; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTextTooLong(): bool
    {
        return $this->value instanceof ContentViolationTextTooLong && $this->type === 'textTooLong';
    }

    /**
     * @return ContentViolationTextTooLong
     */
    public function asTextTooLong(): ContentViolationTextTooLong
    {
        if (!($this->value instanceof ContentViolationTextTooLong && $this->type === 'textTooLong')) {
            throw new Exception(
                "Expected textTooLong; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isForbiddenCharacters(): bool
    {
        return $this->value instanceof ContentViolationForbiddenCharacters && $this->type === 'forbiddenCharacters';
    }

    /**
     * @return ContentViolationForbiddenCharacters
     */
    public function asForbiddenCharacters(): ContentViolationForbiddenCharacters
    {
        if (!($this->value instanceof ContentViolationForbiddenCharacters && $this->type === 'forbiddenCharacters')) {
            throw new Exception(
                "Expected forbiddenCharacters; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyMedia(): bool
    {
        return $this->value instanceof ContentViolationTooManyMedia && $this->type === 'tooManyMedia';
    }

    /**
     * @return ContentViolationTooManyMedia
     */
    public function asTooManyMedia(): ContentViolationTooManyMedia
    {
        if (!($this->value instanceof ContentViolationTooManyMedia && $this->type === 'tooManyMedia')) {
            throw new Exception(
                "Expected tooManyMedia; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyParts(): bool
    {
        return $this->value instanceof ContentViolationTooManyParts && $this->type === 'tooManyParts';
    }

    /**
     * @return ContentViolationTooManyParts
     */
    public function asTooManyParts(): ContentViolationTooManyParts
    {
        if (!($this->value instanceof ContentViolationTooManyParts && $this->type === 'tooManyParts')) {
            throw new Exception(
                "Expected tooManyParts; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isMediaRequired(): bool
    {
        return $this->value instanceof ContentViolationMediaRequired && $this->type === 'mediaRequired';
    }

    /**
     * @return ContentViolationMediaRequired
     */
    public function asMediaRequired(): ContentViolationMediaRequired
    {
        if (!($this->value instanceof ContentViolationMediaRequired && $this->type === 'mediaRequired')) {
            throw new Exception(
                "Expected mediaRequired; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyHashtags(): bool
    {
        return $this->value instanceof ContentViolationTooManyHashtags && $this->type === 'tooManyHashtags';
    }

    /**
     * @return ContentViolationTooManyHashtags
     */
    public function asTooManyHashtags(): ContentViolationTooManyHashtags
    {
        if (!($this->value instanceof ContentViolationTooManyHashtags && $this->type === 'tooManyHashtags')) {
            throw new Exception(
                "Expected tooManyHashtags; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyMentions(): bool
    {
        return $this->value instanceof ContentViolationTooManyMentions && $this->type === 'tooManyMentions';
    }

    /**
     * @return ContentViolationTooManyMentions
     */
    public function asTooManyMentions(): ContentViolationTooManyMentions
    {
        if (!($this->value instanceof ContentViolationTooManyMentions && $this->type === 'tooManyMentions')) {
            throw new Exception(
                "Expected tooManyMentions; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyLinks(): bool
    {
        return $this->value instanceof ContentViolationTooManyLinks && $this->type === 'tooManyLinks';
    }

    /**
     * @return ContentViolationTooManyLinks
     */
    public function asTooManyLinks(): ContentViolationTooManyLinks
    {
        if (!($this->value instanceof ContentViolationTooManyLinks && $this->type === 'tooManyLinks')) {
            throw new Exception(
                "Expected tooManyLinks; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyVideos(): bool
    {
        return $this->value instanceof ContentViolationTooManyVideos && $this->type === 'tooManyVideos';
    }

    /**
     * @return ContentViolationTooManyVideos
     */
    public function asTooManyVideos(): ContentViolationTooManyVideos
    {
        if (!($this->value instanceof ContentViolationTooManyVideos && $this->type === 'tooManyVideos')) {
            throw new Exception(
                "Expected tooManyVideos; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isMixedMedia(): bool
    {
        return $this->value instanceof ContentViolationMixedMedia && $this->type === 'mixedMedia';
    }

    /**
     * @return ContentViolationMixedMedia
     */
    public function asMixedMedia(): ContentViolationMixedMedia
    {
        if (!($this->value instanceof ContentViolationMixedMedia && $this->type === 'mixedMedia')) {
            throw new Exception(
                "Expected mixedMedia; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isMediaTypeUnsupported(): bool
    {
        return $this->value instanceof ContentViolationMediaTypeUnsupported && $this->type === 'mediaTypeUnsupported';
    }

    /**
     * @return ContentViolationMediaTypeUnsupported
     */
    public function asMediaTypeUnsupported(): ContentViolationMediaTypeUnsupported
    {
        if (!($this->value instanceof ContentViolationMediaTypeUnsupported && $this->type === 'mediaTypeUnsupported')) {
            throw new Exception(
                "Expected mediaTypeUnsupported; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isMediaTooLarge(): bool
    {
        return $this->value instanceof ContentViolationMediaTooLarge && $this->type === 'mediaTooLarge';
    }

    /**
     * @return ContentViolationMediaTooLarge
     */
    public function asMediaTooLarge(): ContentViolationMediaTooLarge
    {
        if (!($this->value instanceof ContentViolationMediaTooLarge && $this->type === 'mediaTooLarge')) {
            throw new Exception(
                "Expected mediaTooLarge; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isMediaTooSmall(): bool
    {
        return $this->value instanceof ContentViolationMediaTooSmall && $this->type === 'mediaTooSmall';
    }

    /**
     * @return ContentViolationMediaTooSmall
     */
    public function asMediaTooSmall(): ContentViolationMediaTooSmall
    {
        if (!($this->value instanceof ContentViolationMediaTooSmall && $this->type === 'mediaTooSmall')) {
            throw new Exception(
                "Expected mediaTooSmall; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isVideoTooLong(): bool
    {
        return $this->value instanceof ContentViolationVideoTooLong && $this->type === 'videoTooLong';
    }

    /**
     * @return ContentViolationVideoTooLong
     */
    public function asVideoTooLong(): ContentViolationVideoTooLong
    {
        if (!($this->value instanceof ContentViolationVideoTooLong && $this->type === 'videoTooLong')) {
            throw new Exception(
                "Expected videoTooLong; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isVideoTooShort(): bool
    {
        return $this->value instanceof ContentViolationVideoTooShort && $this->type === 'videoTooShort';
    }

    /**
     * @return ContentViolationVideoTooShort
     */
    public function asVideoTooShort(): ContentViolationVideoTooShort
    {
        if (!($this->value instanceof ContentViolationVideoTooShort && $this->type === 'videoTooShort')) {
            throw new Exception(
                "Expected videoTooShort; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyPixels(): bool
    {
        return $this->value instanceof ContentViolationTooManyPixels && $this->type === 'tooManyPixels';
    }

    /**
     * @return ContentViolationTooManyPixels
     */
    public function asTooManyPixels(): ContentViolationTooManyPixels
    {
        if (!($this->value instanceof ContentViolationTooManyPixels && $this->type === 'tooManyPixels')) {
            throw new Exception(
                "Expected tooManyPixels; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isSideOutOfRange(): bool
    {
        return $this->value instanceof ContentViolationSideOutOfRange && $this->type === 'sideOutOfRange';
    }

    /**
     * @return ContentViolationSideOutOfRange
     */
    public function asSideOutOfRange(): ContentViolationSideOutOfRange
    {
        if (!($this->value instanceof ContentViolationSideOutOfRange && $this->type === 'sideOutOfRange')) {
            throw new Exception(
                "Expected sideOutOfRange; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isAspectRatioUnsupported(): bool
    {
        return $this->value instanceof ContentViolationAspectRatioUnsupported && $this->type === 'aspectRatioUnsupported';
    }

    /**
     * @return ContentViolationAspectRatioUnsupported
     */
    public function asAspectRatioUnsupported(): ContentViolationAspectRatioUnsupported
    {
        if (!($this->value instanceof ContentViolationAspectRatioUnsupported && $this->type === 'aspectRatioUnsupported')) {
            throw new Exception(
                "Expected aspectRatioUnsupported; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isAltTextTooLong(): bool
    {
        return $this->value instanceof ContentViolationAltTextTooLong && $this->type === 'altTextTooLong';
    }

    /**
     * @return ContentViolationAltTextTooLong
     */
    public function asAltTextTooLong(): ContentViolationAltTextTooLong
    {
        if (!($this->value instanceof ContentViolationAltTextTooLong && $this->type === 'altTextTooLong')) {
            throw new Exception(
                "Expected altTextTooLong; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }

    /**
     * @return array<mixed>
     */
    public function jsonSerialize(): array
    {
        $result = [];
        $result['_tag'] = $this->type;

        $base = parent::jsonSerialize();
        $result = array_merge($base, $result);

        switch ($this->type) {
            case 'noChannels':
                $value = $this->asNoChannels()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'overrideWithoutChannel':
                $value = $this->asOverrideWithoutChannel()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'optionsWithoutChannel':
                $value = $this->asOptionsWithoutChannel()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'optionsForOtherPlatform':
                $value = $this->asOptionsForOtherPlatform()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'optionMissing':
                $value = $this->asOptionMissing()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'optionTooLong':
                $value = $this->asOptionTooLong()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'optionInvalid':
                $value = $this->asOptionInvalid()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'empty':
                $value = $this->asEmpty()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'textTooLong':
                $value = $this->asTextTooLong()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'forbiddenCharacters':
                $value = $this->asForbiddenCharacters()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'tooManyMedia':
                $value = $this->asTooManyMedia()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'tooManyParts':
                $value = $this->asTooManyParts()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'mediaRequired':
                $value = $this->asMediaRequired()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'tooManyHashtags':
                $value = $this->asTooManyHashtags()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'tooManyMentions':
                $value = $this->asTooManyMentions()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'tooManyLinks':
                $value = $this->asTooManyLinks()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'tooManyVideos':
                $value = $this->asTooManyVideos()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'mixedMedia':
                $value = $this->asMixedMedia()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'mediaTypeUnsupported':
                $value = $this->asMediaTypeUnsupported()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'mediaTooLarge':
                $value = $this->asMediaTooLarge()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'mediaTooSmall':
                $value = $this->asMediaTooSmall()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'videoTooLong':
                $value = $this->asVideoTooLong()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'videoTooShort':
                $value = $this->asVideoTooShort()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'tooManyPixels':
                $value = $this->asTooManyPixels()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'sideOutOfRange':
                $value = $this->asSideOutOfRange()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'aspectRatioUnsupported':
                $value = $this->asAspectRatioUnsupported()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'altTextTooLong':
                $value = $this->asAltTextTooLong()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case '_unknown':
            default:
                if (is_null($this->value)) {
                    break;
                }
                if ($this->value instanceof JsonSerializableType) {
                    $value = $this->value->jsonSerialize();
                    $result = array_merge($value, $result);
                } elseif (is_array($this->value)) {
                    $result = array_merge($this->value, $result);
                }
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function jsonDeserialize(array $data): static
    {
        $args = [];
        if (!array_key_exists('_tag', $data)) {
            throw new Exception(
                "JSON data is missing property '_tag'",
            );
        }
        $type = $data['_tag'];
        if (!(is_string($type))) {
            throw new Exception(
                "Expected property 'type' in JSON data to be string, instead received " . get_debug_type($data['_tag']),
            );
        }

        $args['type'] = $type;
        switch ($type) {
            case 'noChannels':
                $args['value'] = ContentViolationNoChannels::jsonDeserialize($data);
                break;
            case 'overrideWithoutChannel':
                $args['value'] = ContentViolationOverrideWithoutChannel::jsonDeserialize($data);
                break;
            case 'optionsWithoutChannel':
                $args['value'] = ContentViolationOptionsWithoutChannel::jsonDeserialize($data);
                break;
            case 'optionsForOtherPlatform':
                $args['value'] = ContentViolationOptionsForOtherPlatform::jsonDeserialize($data);
                break;
            case 'optionMissing':
                $args['value'] = ContentViolationOptionMissing::jsonDeserialize($data);
                break;
            case 'optionTooLong':
                $args['value'] = ContentViolationOptionTooLong::jsonDeserialize($data);
                break;
            case 'optionInvalid':
                $args['value'] = ContentViolationOptionInvalid::jsonDeserialize($data);
                break;
            case 'empty':
                $args['value'] = ContentViolationEmpty::jsonDeserialize($data);
                break;
            case 'textTooLong':
                $args['value'] = ContentViolationTextTooLong::jsonDeserialize($data);
                break;
            case 'forbiddenCharacters':
                $args['value'] = ContentViolationForbiddenCharacters::jsonDeserialize($data);
                break;
            case 'tooManyMedia':
                $args['value'] = ContentViolationTooManyMedia::jsonDeserialize($data);
                break;
            case 'tooManyParts':
                $args['value'] = ContentViolationTooManyParts::jsonDeserialize($data);
                break;
            case 'mediaRequired':
                $args['value'] = ContentViolationMediaRequired::jsonDeserialize($data);
                break;
            case 'tooManyHashtags':
                $args['value'] = ContentViolationTooManyHashtags::jsonDeserialize($data);
                break;
            case 'tooManyMentions':
                $args['value'] = ContentViolationTooManyMentions::jsonDeserialize($data);
                break;
            case 'tooManyLinks':
                $args['value'] = ContentViolationTooManyLinks::jsonDeserialize($data);
                break;
            case 'tooManyVideos':
                $args['value'] = ContentViolationTooManyVideos::jsonDeserialize($data);
                break;
            case 'mixedMedia':
                $args['value'] = ContentViolationMixedMedia::jsonDeserialize($data);
                break;
            case 'mediaTypeUnsupported':
                $args['value'] = ContentViolationMediaTypeUnsupported::jsonDeserialize($data);
                break;
            case 'mediaTooLarge':
                $args['value'] = ContentViolationMediaTooLarge::jsonDeserialize($data);
                break;
            case 'mediaTooSmall':
                $args['value'] = ContentViolationMediaTooSmall::jsonDeserialize($data);
                break;
            case 'videoTooLong':
                $args['value'] = ContentViolationVideoTooLong::jsonDeserialize($data);
                break;
            case 'videoTooShort':
                $args['value'] = ContentViolationVideoTooShort::jsonDeserialize($data);
                break;
            case 'tooManyPixels':
                $args['value'] = ContentViolationTooManyPixels::jsonDeserialize($data);
                break;
            case 'sideOutOfRange':
                $args['value'] = ContentViolationSideOutOfRange::jsonDeserialize($data);
                break;
            case 'aspectRatioUnsupported':
                $args['value'] = ContentViolationAspectRatioUnsupported::jsonDeserialize($data);
                break;
            case 'altTextTooLong':
                $args['value'] = ContentViolationAltTextTooLong::jsonDeserialize($data);
                break;
            case '_unknown':
            default:
                $args['type'] = '_unknown';
                $args['value'] = $data;
        }

        // @phpstan-ignore-next-line
        return new static($args);
    }
}
