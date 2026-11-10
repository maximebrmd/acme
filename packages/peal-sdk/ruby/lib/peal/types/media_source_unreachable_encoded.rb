# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaSourceUnreachableEncoded < Internal::Types::Model
      field :reason, -> { Peal::Types::MediaSourceFailure }, optional: false, nullable: false

      field :status, -> { Integer }, optional: false, nullable: true
    end
  end
end
