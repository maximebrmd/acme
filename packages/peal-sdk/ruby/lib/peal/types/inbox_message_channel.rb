# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxMessageChannel < Internal::Types::Model
      field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

      field :enabled_at, -> { String }, optional: false, nullable: false, api_name: "enabledAt"

      field :enabled_by, -> { String }, optional: false, nullable: true, api_name: "enabledBy"
    end
  end
end
