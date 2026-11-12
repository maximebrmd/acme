# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostFormatCapabilities < Internal::Types::Model
      field :description, -> { String }, optional: false, nullable: false

      field :media, -> { Peal::Types::MediaCapabilities }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :sends_text, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "sendsText"
    end
  end
end
