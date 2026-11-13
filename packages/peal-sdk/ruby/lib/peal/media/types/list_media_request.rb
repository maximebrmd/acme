# frozen_string_literal: true

module Peal
  module Media
    module Types
      class ListMediaRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :kind, -> { Peal::Types::MediaKind }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :q, -> { String }, optional: true, nullable: false
      end
    end
  end
end
