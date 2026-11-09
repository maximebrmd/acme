# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelCannotPostEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::ChannelCannotPostEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :reason, -> { Peal::Types::ChannelCannotPostEncodedReason }, optional: false, nullable: false
    end
  end
end
