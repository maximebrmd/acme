# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TextProvider < Internal::Types::Model
      field :base_url, -> { String }, optional: false, nullable: false, api_name: "baseUrl"

      field :key_set, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "keySet"

      field :key_unreadable, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "keyUnreadable"

      field :kind, -> { Peal::Types::TextProviderKind }, optional: false, nullable: false

      field :model, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false, api_name: "updatedAt"
    end
  end
end
