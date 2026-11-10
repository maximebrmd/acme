# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReviewedPart < Internal::Types::Model
      field :delay_seconds, -> { Integer }, optional: false, nullable: false, api_name: "delaySeconds"

      field :media, -> { Internal::Types::Array[Peal::Types::ReviewedMedia] }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
