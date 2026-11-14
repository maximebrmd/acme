# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ContentViolation < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ContentViolationNoChannels }, key: "NO_CHANNELS"

      member -> { Peal::Types::ContentViolationOverrideWithoutChannel }, key: "OVERRIDE_WITHOUT_CHANNEL"

      member -> { Peal::Types::ContentViolationOptionsWithoutChannel }, key: "OPTIONS_WITHOUT_CHANNEL"

      member -> { Peal::Types::ContentViolationOptionsForOtherPlatform }, key: "OPTIONS_FOR_OTHER_PLATFORM"

      member -> { Peal::Types::ContentViolationOptionMissing }, key: "OPTION_MISSING"

      member -> { Peal::Types::ContentViolationOptionTooLong }, key: "OPTION_TOO_LONG"

      member -> { Peal::Types::ContentViolationOptionInvalid }, key: "OPTION_INVALID"

      member -> { Peal::Types::ContentViolationEmpty }, key: "EMPTY"

      member -> { Peal::Types::ContentViolationTextTooLong }, key: "TEXT_TOO_LONG"

      member -> { Peal::Types::ContentViolationForbiddenCharacters }, key: "FORBIDDEN_CHARACTERS"

      member -> { Peal::Types::ContentViolationTooManyMedia }, key: "TOO_MANY_MEDIA"

      member -> { Peal::Types::ContentViolationTooManyParts }, key: "TOO_MANY_PARTS"

      member -> { Peal::Types::ContentViolationPartsNeedReconnect }, key: "PARTS_NEED_RECONNECT"

      member -> { Peal::Types::ContentViolationCommentsTurnedOff }, key: "COMMENTS_TURNED_OFF"

      member -> { Peal::Types::ContentViolationPollNotSupported }, key: "POLL_NOT_SUPPORTED"

      member -> { Peal::Types::ContentViolationPollChoiceCount }, key: "POLL_CHOICE_COUNT"

      member -> { Peal::Types::ContentViolationPollChoiceLength }, key: "POLL_CHOICE_LENGTH"

      member -> { Peal::Types::ContentViolationPollChoiceRepeated }, key: "POLL_CHOICE_REPEATED"

      member -> { Peal::Types::ContentViolationPollDurationOutOfRange }, key: "POLL_DURATION_OUT_OF_RANGE"

      member -> { Peal::Types::ContentViolationPollMultipleChoice }, key: "POLL_MULTIPLE_CHOICE"

      member -> { Peal::Types::ContentViolationPollWithMedia }, key: "POLL_WITH_MEDIA"

      member -> { Peal::Types::ContentViolationMediaRequired }, key: "MEDIA_REQUIRED"

      member -> { Peal::Types::ContentViolationTooManyHashtags }, key: "TOO_MANY_HASHTAGS"

      member -> { Peal::Types::ContentViolationTooManyMentions }, key: "TOO_MANY_MENTIONS"

      member -> { Peal::Types::ContentViolationTooManyLinks }, key: "TOO_MANY_LINKS"

      member -> { Peal::Types::ContentViolationTooManyVideos }, key: "TOO_MANY_VIDEOS"

      member -> { Peal::Types::ContentViolationMixedMedia }, key: "MIXED_MEDIA"

      member -> { Peal::Types::ContentViolationMediaTypeUnsupported }, key: "MEDIA_TYPE_UNSUPPORTED"

      member -> { Peal::Types::ContentViolationMediaTooLarge }, key: "MEDIA_TOO_LARGE"

      member -> { Peal::Types::ContentViolationMediaTooSmall }, key: "MEDIA_TOO_SMALL"

      member -> { Peal::Types::ContentViolationVideoTooLong }, key: "VIDEO_TOO_LONG"

      member -> { Peal::Types::ContentViolationVideoTooShort }, key: "VIDEO_TOO_SHORT"

      member -> { Peal::Types::ContentViolationTooManyPixels }, key: "TOO_MANY_PIXELS"

      member -> { Peal::Types::ContentViolationSideOutOfRange }, key: "SIDE_OUT_OF_RANGE"

      member -> { Peal::Types::ContentViolationAspectRatioUnsupported }, key: "ASPECT_RATIO_UNSUPPORTED"

      member -> { Peal::Types::ContentViolationAltTextTooLong }, key: "ALT_TEXT_TOO_LONG"
    end
  end
end
