# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnknownMediaEncoded < Internal::Types::Model
      field :media_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "mediaIds"
    end
  end
end
