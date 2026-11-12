# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReportAcrossWorkspaces < Internal::Types::Model
      field :from, -> { String }, optional: false, nullable: false

      field :next_cursor, -> { String }, optional: false, nullable: true, api_name: "nextCursor"

      field :previous, -> { Peal::Types::ReportAcrossWorkspacesPrevious }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

      field :to, -> { String }, optional: false, nullable: false

      field :workspaces, -> { Internal::Types::Array[Peal::Types::WorkspaceReport] }, optional: false, nullable: false
    end
  end
end
