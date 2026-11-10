# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReplyInvalidEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::ReplyInvalidEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :length, -> { Integer }, optional: false, nullable: true

      field :maximum, -> { Integer }, optional: false, nullable: true

      field :reason, -> { Peal::Types::ReplyInvalidEncodedReason }, optional: false, nullable: false

      field :unit, -> { String }, optional: false, nullable: true
    end
  end
end
