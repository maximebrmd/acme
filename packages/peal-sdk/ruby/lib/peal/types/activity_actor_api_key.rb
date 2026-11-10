# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ActivityActorAPIKey < Internal::Types::Model
      field :api_key_id, -> { String }, optional: false, nullable: false, api_name: "apiKeyId"
    end
  end
end
