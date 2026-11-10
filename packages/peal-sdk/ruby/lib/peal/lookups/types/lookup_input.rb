# frozen_string_literal: true

module Peal
  module Lookups
    module Types
      class LookupInput < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

        field :name, -> { String }, optional: false, nullable: false

        field :cursor, -> { String }, optional: true, nullable: false

        field :language, -> { String }, optional: true, nullable: false

        field :limit, -> { Integer }, optional: true, nullable: false

        field :region_code, -> { String }, optional: true, nullable: false, api_name: "regionCode"

        field :vanity_name, -> { String }, optional: true, nullable: false, api_name: "vanityName"
      end
    end
  end
end
