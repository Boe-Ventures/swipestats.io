import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "swipestats";

export const MatchRateByGender = () => (
  <Table>
    <TableCaption>Median match rate across 7,000+ profiles.</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Gender</TableHead>
        <TableHead className="text-right">Match rate</TableHead>
        <TableHead className="text-right">Profiles</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell className="font-medium">Women</TableCell>
        <TableCell className="text-right tabular-nums">28.7%</TableCell>
        <TableCell className="text-right tabular-nums">1,872</TableCell>
      </TableRow>
      <TableRow>
        <TableCell className="font-medium">Men</TableCell>
        <TableCell className="text-right tabular-nums">4.6%</TableCell>
        <TableCell className="text-right tabular-nums">5,214</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);

export const SwipesWithFooter = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Platform</TableHead>
        <TableHead className="text-right">Swipes</TableHead>
        <TableHead className="text-right">Matches</TableHead>
        <TableHead className="text-right">Match rate</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell className="font-medium">Tinder</TableCell>
        <TableCell className="text-right tabular-nums">38,608</TableCell>
        <TableCell className="text-right tabular-nums">4,345</TableCell>
        <TableCell className="text-right tabular-nums">11.3%</TableCell>
      </TableRow>
      <TableRow>
        <TableCell className="font-medium">Hinge</TableCell>
        <TableCell className="text-right tabular-nums">6,412</TableCell>
        <TableCell className="text-right tabular-nums">312</TableCell>
        <TableCell className="text-right tabular-nums">4.9%</TableCell>
      </TableRow>
    </TableBody>
    <TableFooter>
      <TableRow>
        <TableCell>Total</TableCell>
        <TableCell className="text-right tabular-nums">45,020</TableCell>
        <TableCell className="text-right tabular-nums">4,657</TableCell>
        <TableCell className="text-right tabular-nums">10.3%</TableCell>
      </TableRow>
    </TableFooter>
  </Table>
);
