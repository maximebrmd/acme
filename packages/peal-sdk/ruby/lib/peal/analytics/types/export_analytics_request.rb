# frozen_string_literal: true

module Peal
  module Analytics
    module Types
      class ExportAnalyticsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :days, -> { String }, optional: true, nullable: false

        field :from, -> { String }, optional: true, nullable: false

        field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"

        field :to, -> { String }, optional: true, nullable: false

        field :format, -> { Peal::Types::AnalyticsExportFormat }, optional: true, nullable: false

        field :kind, -> { Peal::Types::AnalyticsExportKind }, optional: false, nullable: false
      end
    end
  end
end
