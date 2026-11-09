# frozen_string_literal: true

module Peal
  module NotificationPreferences
    module Types
      class NotificationPreferencesChange < Internal::Types::Model
        field :email, -> { Peal::NotificationPreferences::Types::NotificationPreferencesChangeEmail }, optional: true, nullable: false

        field :every_post, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "everyPost"
      end
    end
  end
end
