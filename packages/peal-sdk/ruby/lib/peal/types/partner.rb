# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Partner < Internal::Types::Model
      field :accent_color, -> { String }, optional: false, nullable: true, api_name: "accentColor"

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :id, -> { String }, optional: false, nullable: false

      field :logo_url, -> { String }, optional: false, nullable: true, api_name: "logoUrl"

      field :name, -> { String }, optional: false, nullable: false

      field :return_origins, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "returnOrigins"

      field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
    end
  end
end
