# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConflictErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ChannelSetNameTakenEncoded }, key: "CHANNEL_SET_NAME_TAKEN"

      member -> { Peal::Types::TooManyChannelSetsEncoded }, key: "TOO_MANY_CHANNEL_SETS"
    end
  end
end
