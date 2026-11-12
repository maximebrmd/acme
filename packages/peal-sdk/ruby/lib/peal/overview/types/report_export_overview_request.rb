# frozen_string_literal: true

module Peal
  module Overview
    module Types
      class ReportExportOverviewRequest < Internal::Types::Model
        field :days, -> { String }, optional: true, nullable: false

        field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"
      end
    end
  end
end
