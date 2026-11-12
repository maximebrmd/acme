# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ImageProviderRefusedEncodedReason
      extend Peal::Internal::Types::Enum

      SETTINGS_REFUSED = "settingsRefused"
      ADDRESS_REFUSED = "addressRefused"
      KEY_UNREADABLE = "keyUnreadable"
    end
  end
end
