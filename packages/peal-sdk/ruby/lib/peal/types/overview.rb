# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Overview < Internal::Types::Model
      field :generated_at, -> { String }, optional: false, nullable: false, api_name: "generatedAt"

      field :next_cursor, -> { String }, optional: false, nullable: true, api_name: "nextCursor"

      field :workspaces, -> { Internal::Types::Array[Peal::Types::WorkspaceOverview] }, optional: false, nullable: false
    end
  end
end
