# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LivePostCapabilities < Internal::Types::Model
      field :edit, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :edit_blocked_by, -> { Peal::Types::LivePostBlocker }, optional: true, nullable: false, api_name: "editBlockedBy"

      field :unpublish, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :unpublish_blocked_by, -> { Peal::Types::LivePostBlocker }, optional: true, nullable: false, api_name: "unpublishBlockedBy"
    end
  end
end
