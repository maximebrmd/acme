# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Notice < Internal::Types::Model
      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :event, -> { Peal::Types::NoticeEvent }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :read_at, -> { String }, optional: false, nullable: true, api_name: "readAt"

      field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
    end
  end
end
