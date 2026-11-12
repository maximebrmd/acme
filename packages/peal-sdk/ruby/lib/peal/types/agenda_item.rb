# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AgendaItem < Internal::Types::Model
      field :excerpt, -> { String }, optional: false, nullable: false

      field :platforms, -> { Internal::Types::Array[Peal::Types::Platform] }, optional: false, nullable: true

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :scheduled_at, -> { String }, optional: false, nullable: false, api_name: "scheduledAt"

      field :status, -> { Peal::Types::PostStatus }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
    end
  end
end
