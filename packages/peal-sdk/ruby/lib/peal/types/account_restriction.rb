# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountRestriction < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::AccountRestrictionOptionValues }, key: "OPTION_VALUES"

      member -> { Peal::Types::AccountRestrictionOptionFixed }, key: "OPTION_FIXED"

      member -> { Peal::Types::AccountRestrictionVideoDuration }, key: "VIDEO_DURATION"

      member -> { Peal::Types::AccountRestrictionMediaTypesRefused }, key: "MEDIA_TYPES_REFUSED"

      member -> { Peal::Types::AccountRestrictionOptionNeedsReconnect }, key: "OPTION_NEEDS_RECONNECT"

      member -> { Peal::Types::AccountRestrictionPartsNeedReconnect }, key: "PARTS_NEED_RECONNECT"
    end
  end
end
