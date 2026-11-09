# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NotificationPreferences < Internal::Types::Model
      field :email, -> { Peal::Types::NotificationPreferencesEmail }, optional: false, nullable: false

      field :every_post, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "everyPost"
    end
  end
end
